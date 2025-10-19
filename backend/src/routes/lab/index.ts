import { Elysia } from "elysia";

const labRouter = new Elysia({
	detail: { tags: ["Labs"] }
});

export default labRouter;
export type LabRouter = typeof labRouter;
