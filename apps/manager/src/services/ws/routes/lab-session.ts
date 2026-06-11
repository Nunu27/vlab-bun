import db from "@manager/db";
import { labSessions } from "@manager/db/schema";
import { workerActions } from "@manager/services/actions";
import { getAvailableWorkerId } from "@manager/services/grpc";
import ws from "@manager/services/ws";
import { eq } from "drizzle-orm";

ws.server.on("lab:[id]:init", async (ctx) => {
	const { id } = ctx.params;
	const userId = ctx.context.session.id;

	let workerId: string;
	try {
		workerId = await getAvailableWorkerId();
	} catch (_err) {
		throw new Error("No online workers available to run this lab.");
	}

	await workerActions.dispatch("lab:initSession", workerId, {
		connectionId: ctx.connectionId,
		requestId: ctx.requestId,
		labId: id,
		userId,
	});

	return ws.server.defer;
});

ws.server.on("lab-session:[sessionId]:connect", async (ctx) => {
	const { sessionId } = ctx.params;
	const force = ctx.payload;
	const connectionId = ctx.connectionId;

	const session = await db.query.labSessions.findFirst({
		columns: { clientId: true, labId: true, workerId: true },
		where: (session, { eq, and, isNull }) => {
			return and(
				eq(session.id, sessionId),
				eq(session.studentId, ctx.context.session.id),
				isNull(session.submittedAt),
			);
		},
	});

	if (!session) throw new Error("Session not found");
	if (!force && session.clientId && session.clientId !== connectionId) {
		ctx.reply("conflict", true);
		return;
	}

	ws.server.emit(
		"lab-session:[sessionId]:client-change",
		{ sessionId },
		connectionId,
	);

	await db
		.update(labSessions)
		.set({ clientId: connectionId })
		.where(eq(labSessions.id, sessionId));

	ctx.reply("conflict", false);

	if (session.workerId) {
		await workerActions.dispatch("evaluator:start", session.workerId, {
			sessionId,
			labId: session.labId,
		});
	}
});

ws.server.onDispose("lab-session:[sessionId]:connect", async (connectionId) => {
	const [data] = await db
		.update(labSessions)
		.set({ clientId: null })
		.where(eq(labSessions.clientId, connectionId))
		.returning({ id: labSessions.id });

	if (data) {
		ws.server.emit(
			"lab-session:[sessionId]:client-change",
			{ sessionId: data.id },
			null,
		);
		const session = await db.query.labSessions.findFirst({
			where: eq(labSessions.id, data.id),
			columns: { workerId: true },
		});
		if (session?.workerId) {
			await workerActions.dispatch("evaluator:stop", session.workerId, {
				sessionId: data.id,
			});
		}
	}
});
