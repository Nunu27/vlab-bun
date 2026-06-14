import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import * as schema from "@schema";
import { S3mini } from "s3mini";
import { getDB } from "./db";

async function main() {
	const { values: args } = parseArgs({
		args: Bun.argv,
		options: {
			url: { type: "string" },
			in: { type: "string", default: "lab_backup.json" },
			s3Endpoint: { type: "string" },
			s3AccessKey: { type: "string" },
			s3SecretKey: { type: "string" },
		},
		strict: true,
		allowPositionals: true,
	});

	const url = args.url || prompt("Database Connection URL: ");
	if (!url) {
		console.error("Database URL is required.");
		process.exit(1);
	}

	const s3Endpoint =
		args.s3Endpoint ||
		process.env.S3_ENDPOINT ||
		prompt("S3 Endpoint (e.g. http://localhost:9000): ");
	const s3AccessKey =
		args.s3AccessKey || process.env.S3_ACCESS_KEY || prompt("S3 Access Key: ");
	const s3SecretKey =
		args.s3SecretKey || process.env.S3_SECRET_KEY || prompt("S3 Secret Key: ");

	if (!s3Endpoint || !s3AccessKey || !s3SecretKey) {
		console.error("S3 credentials are required.");
		process.exit(1);
	}

	const s3 = new S3mini({
		endpoint: s3Endpoint,
		accessKeyId: s3AccessKey,
		secretAccessKey: s3SecretKey,
		requestAbortTimeout: 5000,
	});

	const db = getDB(url);
	const dataStr = await fs.readFile(args.in, "utf8");
	const data = JSON.parse(dataStr);

	console.log("Uploading files to S3...");
	const backupDir = path.join(path.dirname(args.in), "backup_files");
	if (data.files && data.files.length > 0) {
		for (const file of data.files) {
			console.log(`Uploading ${file.name}...`);
			const filePath = path.join(backupDir, file.name);
			const exists = await Bun.file(filePath).exists();
			if (!exists) {
				console.warn(`File ${filePath} not found, skipping S3 upload.`);
				continue;
			}
			const buffer = await fs.readFile(filePath);
			// We need to guess mime type or just application/octet-stream
			const res = await s3.putObject(
				file.name,
				buffer,
				"application/octet-stream",
			);
			if (!res?.ok) {
				console.error(`Failed to upload ${file.name}: ${res?.statusText}`);
			}
		}
	}

	console.log("Restoring data to database...");
	const tables = schema;

	await db.transaction(async (tx) => {
		if (data.files?.length) {
			console.log(`Restoring ${data.files.length} files...`);
			for (const row of data.files) {
				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				await tx
					.insert(tables.files)
					.values(row)
					.onConflictDoUpdate({ target: tables.files.id, set: row });
			}
		}

		if (data.users?.length) {
			console.log(`Restoring ${data.users.length} users...`);
			for (const row of data.users) {
				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				await tx
					.insert(tables.users)
					.values(row)
					.onConflictDoUpdate({ target: tables.users.id, set: row });
			}
		}

		if (data.instructors?.length) {
			console.log(`Restoring ${data.instructors.length} instructors...`);
			for (const row of data.instructors) {
				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				await tx
					.insert(tables.instructors)
					.values(row)
					.onConflictDoUpdate({ target: tables.instructors.id, set: row });
			}
		}

		if (data.deviceCategories?.length) {
			console.log(
				`Restoring ${data.deviceCategories.length} device categories...`,
			);
			for (const row of data.deviceCategories) {
				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				await tx
					.insert(tables.deviceCategories)
					.values(row)
					.onConflictDoUpdate({
						target: tables.deviceCategories.id,
						set: row,
					});
			}
		}

		if (data.deviceTemplates?.length) {
			console.log(
				`Restoring ${data.deviceTemplates.length} device templates...`,
			);
			for (const row of data.deviceTemplates) {
				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				await tx.insert(tables.deviceTemplates).values(row).onConflictDoUpdate({
					target: tables.deviceTemplates.id,
					set: row,
				});
			}
		}

		if (data.labs?.length) {
			console.log(`Restoring ${data.labs.length} labs...`);
			for (const row of data.labs) {
				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				row.startAt = new Date(row.startAt);
				row.endAt = new Date(row.endAt);
				await tx
					.insert(tables.labs)
					.values(row)
					.onConflictDoUpdate({ target: tables.labs.id, set: row });
			}
		}

		if (data.labAttachments?.length) {
			console.log(`Restoring ${data.labAttachments.length} lab attachments...`);
			for (const row of data.labAttachments) {
				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				await tx
					.insert(tables.labAttachments)
					.values(row)
					.onConflictDoUpdate({ target: tables.labAttachments.id, set: row });
			}
		}

		if (data.labEmbeddedFiles?.length) {
			console.log(
				`Restoring ${data.labEmbeddedFiles.length} lab embedded files...`,
			);
			for (const row of data.labEmbeddedFiles) {
				await tx
					.insert(tables.labEmbeddedFiles)
					.values(row)
					.onConflictDoUpdate({
						target: [
							tables.labEmbeddedFiles.labId,
							tables.labEmbeddedFiles.file,
						],
						set: row,
					});
			}
		}
	});

	console.log("Restore complete!");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
