import { name, version } from "@/../package.json";
import { success } from "@/utils/response";

import { Elysia } from "elysia";
import auth from "./auth";
import department from "./department";
import lecturer from "./lecturer";
import student from "./student";
import studyProgram from "./study-program";

const app: Elysia = new Elysia();

app.get("/", () => success({ data: { name, version } }));
app.use(auth);
app.use(department);
app.use(studyProgram);
app.use(student);
app.use(lecturer);

export default app;
