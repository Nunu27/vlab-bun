import { sql } from "drizzle-orm";
import db from "./src/db";

try {
	await db.execute(sql`TRUNCATE TABLE lab_session CASCADE;`);
	console.log("Truncated lab_session");
} catch (e) {
	console.error("Error", e);
}
