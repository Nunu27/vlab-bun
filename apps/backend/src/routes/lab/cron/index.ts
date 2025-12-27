import Elysia from "elysia";
import labSessionCleanup from "./lab-session-cleanup";

export default new Elysia().use(labSessionCleanup);
