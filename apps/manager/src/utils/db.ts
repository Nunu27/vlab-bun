import { sql } from "drizzle-orm";

interface ReturningQuery {
	returning(fields: Record<string, unknown>): Promise<unknown[]>;
}

export async function getAffectedCount(qb: ReturningQuery) {
	const rows = await qb.returning({ count: sql`1` });
	return rows.length;
}
