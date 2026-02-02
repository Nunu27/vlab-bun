import db from "@api/db";
import { students, users } from "@api/db/schema/auth";
import env from "@api/env";
import auth from "@api/middlewares/auth";
import { deleteCache } from "@api/middlewares/caching";
import toast from "@api/middlewares/toast";
import { CASResponseSchema } from "@vlab/shared/schemas/cas";
import Elysia from "elysia";
import { compile } from "elysia/type-system/utils";
import { XMLParser } from "fast-xml-parser";

const { BASE_URL, CAS_BASE_URL } = env;
const SERVICE = `${BASE_URL}/api/auth/cas`;
const CAS_LOGIN = `${CAS_BASE_URL}/cas/login?service=${encodeURIComponent(SERVICE)}`;
const CAS_VALIDATE = `${CAS_BASE_URL}/cas/validate?service=${encodeURIComponent(SERVICE)}&ticket=`;

type CASResponse = typeof CASResponseSchema.static;

const CASResponseValidator = compile(CASResponseSchema);
const parser = new XMLParser({
	transformTagName: (tagName) => tagName.slice(4),
});

export default new Elysia()
	.use(toast)
	.use(auth)
	.get(
		"/cas",
		async ({ session, redirect, query: { ticket }, cookie: { toast } }) => {
			if (session.data) {
				toast.value = {
					message: "You are already logged in",
					type: "error",
				};

				return redirect(BASE_URL);
			} else if (!ticket) return redirect(CAS_LOGIN);

			const res = await fetch(CAS_VALIDATE + encodeURIComponent(ticket), {
				signal: AbortSignal.timeout(3000),
			});
			const data = parser.parse(await res.text()) as CASResponse;

			if (
				!CASResponseValidator.Check(data) ||
				!data.serviceResponse.authenticationSuccess
			) {
				toast.value = {
					message: "CAS authentication failed",
					type: "error",
				};

				return redirect(BASE_URL);
			}

			const userInfo = data.serviceResponse.authenticationSuccess.attributes;
			let user = await db.query.users.findFirst({
				where: (user, { eq }) => eq(user.email, userInfo.mail),
				columns: { id: true, role: true },
			});

			if (!user) {
				const userId = await db.transaction(async (tx) => {
					const [user] = await tx
						.insert(users)
						.values({
							email: userInfo.mail,
							name: userInfo.Name,
						})
						.returning({ id: users.id });

					const studyProgram = await tx.query.studyPrograms.findFirst({
						columns: { id: true },
						where: ({ name }, { eq }) => eq(name, userInfo.Jurusan),
					});

					if (!studyProgram) {
						throw new Error("Study program not found");
					}

					const nrp = userInfo.NRP.toString();

					await tx.insert(students).values({
						id: user.id,
						nrp,
						year: 2000 + parseInt(nrp.substring(2, 4), 10),
						degreeLevel: "D4",
						studyProgramId: studyProgram.id,
					});

					return user.id;
				});

				user = {
					id: userId,
					role: "student",
				};

				await deleteCache("student:pagination:*");
			}

			await session.set({ ...user, useCAS: true });

			toast.value = {
				message: "Logged in successfully via CAS",
				type: "success",
			};

			return redirect(BASE_URL);
		},
		{ auth: true, detail: { hide: true } },
	);
