import db from "@manager/db";
import { students, users } from "@manager/db/schema/auth";
import env from "@manager/env";
import logger from "@manager/lib/logger";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import toast from "@manager/services/http/middlewares/toast";
import { createRouter } from "@manager/services/http/plugins/system";
import { parseNRP } from "@manager/utils/nrp";
import { CASResponseSchema } from "@vlab/shared/schemas/cas";
import { compile } from "elysia/type-system/utils";
import { XMLParser } from "fast-xml-parser";

const { BASE_URL, CAS_BASE_URL } = env;
const SERVICE = `${BASE_URL}/api/auth/cas`;
const CAS_LOGIN = `${CAS_BASE_URL}/cas/login?service=${encodeURIComponent(SERVICE)}`;
const CAS_VALIDATE = `${CAS_BASE_URL}/cas/serviceValidate?service=${encodeURIComponent(SERVICE)}&ticket=`;

type CASResponse = typeof CASResponseSchema.static;

const CASResponseValidator = compile(CASResponseSchema);
const parser = new XMLParser({
	transformTagName: (tagName) => tagName.slice(4),
});

export default createRouter()
	.use(toast)
	.use(auth)
	.get(
		"/cas",
		async ({ session, redirect, query: { ticket }, setToast }) => {
			if (session.data) {
				setToast("error", "You are already logged in");

				return redirect(BASE_URL);
			} else if (!ticket) return redirect(CAS_LOGIN);

			const res = await fetch(CAS_VALIDATE + encodeURIComponent(ticket), {
				signal: AbortSignal.timeout(3000),
			});
			const data = parser.parse(await res.text()) as CASResponse;

			logger.info({ ticket, data }, "CAS response");

			if (
				!CASResponseValidator.Check(data) ||
				!data.serviceResponse.authenticationSuccess
			) {
				setToast("error", "CAS authentication failed");

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

					const nrpStr = userInfo.NRP.toString();
					const parsedNRP = parseNRP(nrpStr);

					if (!parsedNRP) {
						throw new Error("Invalid NRP");
					}

					if (userInfo.Jurusan !== parsedNRP.programName) {
						logger.debug({ userInfo, parsedNRP }, "NRP mismatch");
					}

					const studyProgram = await tx.query.studyPrograms.findFirst({
						columns: { id: true },
						where: ({ name }, { eq }) => eq(name, userInfo.Jurusan),
					});

					if (!studyProgram) {
						throw new Error("Study program not found");
					}

					await tx.insert(students).values({
						id: user.id,
						nrp: nrpStr,
						year: parsedNRP.year,
						degreeLevel: parsedNRP.degreeLevel,
						studyProgramId: studyProgram.id,
					});

					return user.id;
				});

				user = {
					id: userId,
					role: "student",
				};

				await cache.delete("student:pagination:*");
			}

			await session.set({ ...user, useCAS: true });
			setToast("success", "Logged in successfully via CAS");

			return redirect(BASE_URL);
		},
		{ auth: true, detail: { hide: true } },
	);
