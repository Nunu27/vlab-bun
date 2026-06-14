import fs from "node:fs/promises";
import path from "node:path";
import db from "@manager/db";
import {
	deviceCategories,
	deviceTemplates,
	files,
	instructors,
	labAttachments,
	labEmbeddedFiles,
	labs,
	users,
} from "@manager/db/schema";
import baseLogger from "@manager/lib/logger";
import storage from "@manager/lib/storage";
import { encode } from "@msgpack/msgpack";
import { inArray } from "drizzle-orm";

const logger = baseLogger.child({ service: "backup" });

export async function runBackup() {
	logger.info("Fetching files...");
	const filesData = await db.select().from(files);

	logger.info("Fetching device categories...");
	const deviceCategoriesData = await db.select().from(deviceCategories);

	logger.info("Fetching device templates...");
	const deviceTemplatesData = await db.select().from(deviceTemplates);

	logger.info("Fetching instructors...");
	const instructorsData = await db.select().from(instructors);

	logger.info("Fetching users (instructors only)...");

	const instructorIds = instructorsData.map((i) => i.id);
	const usersData =
		instructorIds.length > 0
			? await db.select().from(users).where(inArray(users.id, instructorIds))
			: [];

	logger.info("Fetching labs...");
	const labsData = await db.select().from(labs);

	logger.info("Fetching lab attachments...");
	const labAttachmentsData = await db.select().from(labAttachments);

	logger.info("Fetching lab embedded files...");
	const labEmbeddedFilesData = await db.select().from(labEmbeddedFiles);

	const backupData = {
		files: filesData,
		users: usersData,
		instructors: instructorsData,
		deviceCategories: deviceCategoriesData,
		deviceTemplates: deviceTemplatesData,
		labs: labsData,
		labAttachments: labAttachmentsData,
		labEmbeddedFiles: labEmbeddedFilesData,
	};

	const outDir = "lab_backup";
	const outDataPath = path.join(outDir, "data.msgpack");
	const outFilesDir = path.join(outDir, "files");

	logger.info(`Saving backup data to ${outDir}...`);
	await fs.mkdir(outDir, { recursive: true });
	await fs.writeFile(outDataPath, encode(backupData));

	logger.info("Downloading files from S3...");
	await fs.mkdir(outFilesDir, { recursive: true });

	for (const file of filesData) {
		logger.info(`Downloading ${file.name}...`);
		const res = await storage.getObjectResponse(file.name);
		if (!res?.ok) {
			logger.error(`Failed to download ${file.name}: ${res?.statusText}`);
			continue;
		}
		const buffer = await res.arrayBuffer();
		await fs.writeFile(path.join(outFilesDir, file.name), Buffer.from(buffer));
	}

	console.log("Backup complete!");
}
