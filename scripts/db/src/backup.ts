import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import * as schema from "@schema";
import { inArray } from "drizzle-orm";
import { S3mini } from "s3mini";
import { getDB } from "./db";

async function main() {
	const { values: args } = parseArgs({
		args: Bun.argv,
		options: {
			url: { type: "string" },
			out: { type: "string", default: "lab_backup.json" },
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

	const tables = schema;

	console.log("Fetching files...");
	const files = await db.select().from(tables.files);

	console.log("Fetching device categories...");
	const deviceCategories = await db.select().from(tables.deviceCategories);

	console.log("Fetching device templates...");
	const deviceTemplates = await db.select().from(tables.deviceTemplates);

	console.log("Fetching instructors...");
	const instructors = await db.select().from(tables.instructors);

	console.log("Fetching users (instructors only)...");

	const instructorIds = instructors.map((i) => i.id);
	const users =
		instructorIds.length > 0
			? await db
					.select()
					.from(tables.users)
					.where(inArray(tables.users.id, instructorIds))
			: [];

	console.log("Fetching labs...");
	const labs = await db.select().from(tables.labs);

	console.log("Fetching lab attachments...");
	const labAttachments = await db.select().from(tables.labAttachments);

	console.log("Fetching lab embedded files...");
	const labEmbeddedFiles = await db.select().from(tables.labEmbeddedFiles);

	const backupData = {
		files,
		users,
		instructors,
		deviceCategories,
		deviceTemplates,
		labs,
		labAttachments,
		labEmbeddedFiles,
	};

	console.log(`Saving backup data to ${args.out}...`);
	await fs.writeFile(args.out, JSON.stringify(backupData, null, 2));

	console.log("Downloading files from S3...");
	const backupDir = path.join(path.dirname(args.out), "backup_files");
	await fs.mkdir(backupDir, { recursive: true });

	for (const file of files) {
		console.log(`Downloading ${file.name}...`);
		const res = await s3.getObjectResponse(file.name);
		if (!res?.ok) {
			console.error(`Failed to download ${file.name}: ${res?.statusText}`);
			continue;
		}
		const buffer = await res.arrayBuffer();
		await fs.writeFile(path.join(backupDir, file.name), Buffer.from(buffer));
	}

	console.log("Backup complete!");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
