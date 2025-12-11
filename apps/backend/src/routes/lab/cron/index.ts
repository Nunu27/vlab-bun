import Elysia from "elysia";
import deviceTestSessionCleanup from "./lab-session-cleanup";

export default new Elysia().use(deviceTestSessionCleanup);
