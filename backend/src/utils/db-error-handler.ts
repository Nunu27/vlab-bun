import { status } from "elysia";
import { DatabaseError } from "pg";
import { failure } from "./response";

const toTitleCase = (str: string) => {
	return str
		.toLowerCase()
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
};
// 2025/11/20 06:17PM 50 pid=1 hostname=f0971ee44492 error={"length":391,"name":"error","severity":"ERROR","code":"23001","detail":"Key (id)=(019a4bf1-1ec4-7001-81c9-8839bcd30ad3) is referenced from table \"study_program\".","schema":"public","table":"study_program","constraint":"study_program_department_id_department_id_fk","file":"ri_triggers.c","routine":"ri_ReportViolation","stack":"error: update or delete on table \"department\" violates RESTRICT setting of foreign key constraint \"study_program_department_id_department_id_fk\" on table \"study_program\"\n    at <anonymous> (../node_modules/pg-pool/index.js:45:11)\n    at processTicksAndRejections (native:7:39)"} msg=Failed query: delete from "department" where "department"."id" = $1
// params: 019a4bf1-1ec4-7001-81c9-8839bcd30ad3
function handleForeignKeyViolation(error: DatabaseError) {
	if (
		error.detail?.includes("still referenced") ||
		error.detail?.includes("is referenced")
	) {
		const table = error.table ? toTitleCase(error.table) : null;

		return status(
			409,
			failure({
				message: `Cannot delete the data because it is still referenced by ${table ?? "other"} data.`
			})
		);
	} else if (error.detail?.includes("not present")) {
		const [, table] = error.detail.split('"');

		return status(
			422,
			failure({
				message: `The referenced ${toTitleCase(table)} does not exist.`
			})
		);
	}

	return status(
		400,
		failure({
			message: "Foreign key violation error."
		})
	);
}

export default {
	"23503": handleForeignKeyViolation,
	"23001": handleForeignKeyViolation
} as const;
