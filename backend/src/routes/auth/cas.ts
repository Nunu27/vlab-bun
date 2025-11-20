import { students, users } from "@backend/db/schema/auth";
import env from "@backend/env";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { ToastType } from "@backend/types/toast";
import { compile } from "elysia/type-system/utils";
import { XMLParser } from "fast-xml-parser";
import { CASRequestQuery, CASResponseSchema } from "./schema";

const { BASE_URL, CAS_BASE_URL, SESSION_TTL } = env;
const parser = new XMLParser({
	transformTagName: (tagName) => tagName.slice(4)
});

type CASResponse = typeof CASResponseSchema.static;
const CASResponseValidator = compile(CASResponseSchema);

export default createRouter().get(
	"/cas",
	async ({ sessionId, query: { ticket }, redirect, redis, db, cookie }) => {
		const service = `${BASE_URL}/api/auth/cas`;

		const casUrl = new URL(CAS_BASE_URL);
		casUrl.searchParams.set("service", service);

		if (!ticket) {
			casUrl.pathname = "/cas/login";

			return redirect(casUrl.toString());
		}

		casUrl.pathname = "/cas/serviceValidate";
		casUrl.searchParams.set("ticket", ticket);
		const res = await fetch(casUrl.toString());
		const text = await res.text();
		const data = parser.parse(text) as CASResponse;

		if (
			!CASResponseValidator.Check(data) ||
			!data.serviceResponse.authenticationSuccess
		) {
			cookie.toast.value = {
				message: "CAS authentication failed",
				type: ToastType.Error
			};
			return redirect(BASE_URL);
		}

		const userInfo = data.serviceResponse.authenticationSuccess.attributes;
		let user = await db.query.users.findFirst({
			where: (user, { eq }) => eq(user.email, userInfo.mail),
			columns: { id: true, role: true }
		});

		if (!user) {
			const userId = await db.transaction(async (tx) => {
				const [user] = await tx
					.insert(users)
					.values({
						email: userInfo.mail,
						name: userInfo.Name
					})
					.returning({ id: users.id });

				const studyProgram = await tx.query.studyPrograms.findFirst({
					columns: { id: true },
					where: ({ name }, { eq }) => eq(name, userInfo.Jurusan)
				});

				if (!studyProgram) {
					throw new Error("Study program not found");
				}

				const nrp = userInfo.NRP.toString();

				await tx.insert(students).values({
					id: user.id,
					nrp: nrp,
					year: 2000 + parseInt(nrp.toString().substring(2, 4)),
					degreeLevel: "D4",
					studyProgramId: studyProgram.id
				});

				return user.id;
			});

			user = {
				id: userId,
				role: "student"
			};

			await deleteCache("student:pagination:*");
		}

		await redis.set(sessionId, { ...user, useCAS: true }, SESSION_TTL);

		cookie.toast.value = {
			message: "Logged in successfully via CAS",
			type: ToastType.Success
		};

		return redirect(BASE_URL);
	},
	{
		guest: true,
		query: CASRequestQuery,
		detail: {
			description: "Login with email and password"
		}
	}
);
