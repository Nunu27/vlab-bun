import { Elysia } from "elysia";

export default new Elysia({
	prefix: "/device",
	detail: { tags: ["Device"] }
});
