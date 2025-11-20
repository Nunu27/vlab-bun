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

function handleForeignKeyViolation(error: DatabaseError) {
	if (error.detail?.includes("still referenced")) {
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
