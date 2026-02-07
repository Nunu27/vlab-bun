import { failure } from "@jawit/common";
import { TypeGuard } from "@sinclair/typebox";
import { status } from "elysia";
import type { ValidationError } from "elysia/error";
import type { DatabaseError } from "pg";
import { toTitleCase } from "./string";

function handleForeignKeyViolation(error: DatabaseError) {
	if (
		error.detail?.includes("still referenced") ||
		error.detail?.includes("is referenced")
	) {
		const table = error.table ? toTitleCase(error.table) : null;

		return status(
			409,
			failure({
				message: `Cannot delete the data because it is still referenced by ${table ?? "other"} data.`,
			}),
		);
	} else if (error.detail?.includes("not present")) {
		const [, table] = error.detail.split('"');

		return status(
			422,
			failure({
				message: `The referenced ${toTitleCase(table)} does not exist.`,
			}),
		);
	}

	return status(
		400,
		failure({
			message: "Foreign key violation error.",
		}),
	);
}

function handleUniqueViolation(error: DatabaseError) {
	if (error.detail?.startsWith("Key (")) {
		const table = error.table ? toTitleCase(error.table) : "data";
		const column = error.detail.substring(5, error.detail.indexOf(")="));

		return status(
			400,
			failure({
				message: `The ${toTitleCase(column)} is already used by other ${table}.`,
			}),
		);
	}

	return status(
		400,
		failure({
			message: "Unique key violation error.",
		}),
	);
}

const dbErrorHandlers = {
	"23001": handleForeignKeyViolation,
	"23503": handleForeignKeyViolation,
	"23505": handleUniqueViolation,
} as const;

export function formatDBError(error: DatabaseError) {
	const { code } = error;
	if (!code || !(code in dbErrorHandlers)) {
		return null;
	}

	return dbErrorHandlers[code as keyof typeof dbErrorHandlers](error);
}

function getValidationMessage(error: ValidationError["all"][number]) {
	if (TypeGuard.IsUnion(error.schema)) {
		if (TypeGuard.IsUnionLiteral(error.schema)) {
			return `Value must be one of: ${error.schema.anyOf.map((schema) => `'${schema.const}'`).join(", ")}`;
		} else return `Invalid value`;
	} else {
		return error.message;
	}
}

export function formatValidationError(error: Readonly<ValidationError>) {
	return error.all.reduce(
		(acc, err) => {
			if (!err.path) {
				if (!acc.root) acc.root = err.message;
				return acc;
			}

			const fieldName = err.path
				.slice(1)
				.split("/") // split into segments
				.reduce((path, segment, index) => {
					// Check if the segment is a number (array index)
					const isIndex = !Number.isNaN(Number(segment));

					if (isIndex) {
						// Wrap numbers in square brackets without a leading dot
						return `${path}[${segment}]`;
					}

					// Add a dot before object keys (except for the very first segment)
					return index === 0 ? segment : `${path}.${segment}`;
				}, "");

			// Keep the first error message encountered for each field
			if (!acc[fieldName]) {
				acc[fieldName] = getValidationMessage(err);
			}

			return acc;
		},
		{} as Record<string, string>,
	);
}
