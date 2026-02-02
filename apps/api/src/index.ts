import { Elysia } from "elysia";
import env from "./env";

const app = new Elysia().get("/", () => "Hello Elysia").listen(env.PORT);
export type App = typeof app;
