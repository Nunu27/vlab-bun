import type db from "@manager/db";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
