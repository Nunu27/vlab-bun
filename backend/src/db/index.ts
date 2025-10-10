import env from "@/env";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export default drizzle(env.DATABASE_URL, { schema });
