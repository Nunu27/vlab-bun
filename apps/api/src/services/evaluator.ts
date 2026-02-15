import db from "@api/db";
import { labSessionChecks, labSessions } from "@api/db/schema";
import docker from "@api/services/docker";
import ws from "@api/services/ws";
import evaluator from "@vlab/evaluator";
import type { LabCheckConfig, LabInstruction } from "@vlab/shared/schemas/lab";
import { eq } from "drizzle-orm";

export function extractChecksFromInstructions(instructions: LabInstruction[]) {
	const results: LabCheckConfig[] = [];
	const traverse = (items: LabInstruction[]) => {
		for (const item of items) {
			results.push(...item.checks);
			if (item.children?.length) traverse(item.children as LabInstruction[]);
		}
	};
	traverse(instructions);
	return results;
}

const activeEvaluations = new Map<
	string,
	{ session: ReturnType<typeof evaluator.createSession>; timeout?: Timer }
>();

export async function startLabEvaluation(
	sessionId: string,
	options: {
		instructions: LabInstruction[];
		nodes: { id: string; labNodeId: string }[];
	},
) {
	const active = activeEvaluations.get(sessionId);
	if (active) {
		if (active.timeout) clearTimeout(active.timeout);
		active.timeout = undefined;
		return active.session;
	}

	const allChecks = extractChecksFromInstructions(options.instructions);
	const nodeMapping = new Map(options.nodes.map((n) => [n.labNodeId, n.id]));

	const sessionChecks = allChecks
		.filter((c) => nodeMapping.has(c.nodeId))
		.map((c) => ({
			id: c.id,
			checkerId: c.checkId,
			nodeId: nodeMapping.get(c.nodeId) || "",
			params: c.params,
		}));

	const totalWeight = allChecks.reduce((acc, c) => acc + c.weight, 0);
	const evalSession = evaluator.createSession(
		docker,
		// biome-ignore lint/suspicious/noExplicitAny: Internal config bypass
		sessionChecks as any,
	);

	evalSession.onChange(async (checkId, value) => {
		if (!value) return;

		const existing = await db.query.labSessionChecks.findFirst({
			where: (c, { eq, and }) =>
				and(eq(c.labSessionId, sessionId), eq(c.checkId, checkId)),
		});

		if (existing) {
			if (existing.completed) return;
			await db
				.update(labSessionChecks)
				.set({ completed: true })
				.where(eq(labSessionChecks.id, existing.id));
		} else {
			await db.insert(labSessionChecks).values({
				labSessionId: sessionId,
				checkId,
				completed: true,
			});
		}

		const completedChecks = await db.query.labSessionChecks.findMany({
			where: (c, { eq, and }) =>
				and(eq(c.labSessionId, sessionId), eq(c.completed, true)),
		});

		const completedWeights = completedChecks.reduce((score, c) => {
			const config = allChecks.find((ch) => ch.id === c.checkId);
			return score + (config?.weight || 0);
		}, 0);

		const newScore =
			totalWeight > 0
				? ((completedWeights / totalWeight) * 100).toFixed(2)
				: "0";

		await db
			.update(labSessions)
			.set({ score: newScore })
			.where(eq(labSessions.id, sessionId));

		ws.server.emit("lab-session:[sessionId]:session-change", {
			params: { sessionId },
		});
	});

	await evalSession.start();
	evalSession.check();
	activeEvaluations.set(sessionId, { session: evalSession });

	return evalSession;
}

export function stopLabEvaluation(sessionId: string) {
	const active = activeEvaluations.get(sessionId);
	if (active) {
		active.timeout = setTimeout(() => {
			active.session.stop();
			activeEvaluations.delete(sessionId);
		}, 30000); // 30 seconds reconnect window
	}
}
