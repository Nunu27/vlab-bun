import { Elysia } from "elysia";

import { topicEmitter } from "@backend/services/ws";
import { labNodeHealthTopic } from "@shared/schemas/ws";
import detail from "./detail";
import node from "./node";

topicEmitter.register(labNodeHealthTopic);

const labRouter = new Elysia().use(detail).use(node);

export default labRouter;
