import Elysia from "elysia";
import deviceTestSessionCleanup from "./device-test-session-cleanup";

export default new Elysia().use(deviceTestSessionCleanup);
