import { name, version } from "@/../package.json";
import { success } from "@/utils/response";

import { Elysia } from "elysia";
import authRouter from "./auth";
import departmentRouter from "./department";
import studyProgramRouter from "./study-program";
import userRouter from "./user";

const app = new Elysia();

app.get("/", () => success({ data: { name, version } }));
app.group("/auth", (app) => app.use(authRouter));
app.group("/department", (app) => app.use(departmentRouter));
app.group("/study-program", (app) => app.use(studyProgramRouter));
app.group("/user", (app) => app.use(userRouter));

export default app;
