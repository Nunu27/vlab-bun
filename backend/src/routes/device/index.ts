import { Elysia } from "elysia";

const deviceRouter = new Elysia({
	detail: { tags: ["Device"] }
});

export default deviceRouter;
