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
import { decode } from "@msgpack/msgpack";
import { eq } from "drizzle-orm";

function detectMimeType(buf: Buffer): string {
	// PDF: %PDF
	if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)
		return "application/pdf";
	// PNG: \x89PNG
	if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
		return "image/png";
	// JPEG: \xFF\xD8\xFF
	if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
		return "image/jpeg";
	// GIF: GIF8
	if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38)
		return "image/gif";
	// WEBP: RIFF....WEBP
	if (
		buf[0] === 0x52 &&
		buf[1] === 0x49 &&
		buf[2] === 0x46 &&
		buf[3] === 0x46 &&
		buf[8] === 0x57 &&
		buf[9] === 0x45 &&
		buf[10] === 0x42 &&
		buf[11] === 0x50
	)
		return "image/webp";
	// SVG: text starting with <svg or <?xml
	const head = buf.subarray(0, 128).toString("utf8").trimStart();
	if (head.startsWith("<svg") || head.startsWith("<?xml"))
		return "image/svg+xml";
	return "application/octet-stream";
}

const logger = baseLogger.child({ service: "restore" });

export async function runRestore() {
	const inDir = "lab_backup";
	const inDataPath = path.join(inDir, "data.msgpack");
	const inFilesDir = path.join(inDir, "files");

	const dataBuffer = await fs.readFile(inDataPath);
	// biome-ignore lint/suspicious/noExplicitAny: We know what we're doing
	const data = decode(dataBuffer) as any;

	logger.info("Uploading files to S3...");
	if (data.files && data.files.length > 0) {
		for (const file of data.files) {
			logger.info(`Uploading ${file.name}...`);
			const filePath = path.join(inFilesDir, file.name);
			const exists = await Bun.file(filePath).exists();
			if (!exists) {
				logger.warn(`File ${filePath} not found, skipping S3 upload.`);
				continue;
			}
			const buffer = await fs.readFile(filePath);
			const res = await storage.putObject(
				file.name,
				buffer,
				detectMimeType(buffer),
			);
			if (!res?.ok) {
				logger.error(`Failed to upload ${file.name}: ${res?.statusText}`);
			}
		}
	}

	logger.info("Restoring data to database...");

	await db.transaction(async (tx) => {
		const idMapping = new Map<string, string>();

		if (data.files?.length) {
			logger.info(`Restoring ${data.files.length} files...`);
			for (const row of data.files) {
				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				await tx
					.insert(files)
					.values(row)
					.onConflictDoUpdate({ target: files.id, set: row });
			}
		}

		if (data.users?.length) {
			logger.info(`Restoring ${data.users.length} users...`);
			for (const row of data.users) {
				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;

				const existing = await tx
					.select()
					.from(users)
					.where(eq(users.email, row.email))
					.limit(1);

				if (existing.length > 0) {
					if (existing[0].id !== row.id) {
						logger.info(
							`Email conflict for ${row.email}: Mapping dump ID (${row.id}) to existing DB ID (${existing[0].id})`,
						);
						idMapping.set(row.id, existing[0].id);
						row.id = existing[0].id;
					}
				}

				await tx
					.insert(users)
					.values(row)
					.onConflictDoUpdate({ target: users.id, set: row });
			}
		}

		if (data.instructors?.length) {
			logger.info(`Restoring ${data.instructors.length} instructors...`);
			for (const row of data.instructors) {
				if (idMapping.has(row.id)) {
					row.id = idMapping.get(row.id) as string;
				}

				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				await tx
					.insert(instructors)
					.values(row)
					.onConflictDoUpdate({ target: instructors.id, set: row });
			}
		}

		if (data.deviceCategories?.length) {
			logger.info(
				`Restoring ${data.deviceCategories.length} device categories...`,
			);
			for (const row of data.deviceCategories) {
				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				await tx.insert(deviceCategories).values(row).onConflictDoUpdate({
					target: deviceCategories.id,
					set: row,
				});
			}
		}

		if (data.deviceTemplates?.length) {
			logger.info(
				`Restoring ${data.deviceTemplates.length} device templates...`,
			);
			for (const row of data.deviceTemplates) {
				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				await tx.insert(deviceTemplates).values(row).onConflictDoUpdate({
					target: deviceTemplates.id,
					set: row,
				});
			}
		}

		if (data.labs?.length) {
			logger.info(`Restoring ${data.labs.length} labs...`);
			for (const row of data.labs) {
				if (idMapping.has(row.instructorId)) {
					row.instructorId = idMapping.get(row.instructorId) as string;
				}

				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				row.startAt = new Date(row.startAt);
				row.endAt = new Date(row.endAt);
				await tx
					.insert(labs)
					.values(row)
					.onConflictDoUpdate({ target: labs.id, set: row });
			}
		}

		if (data.labAttachments?.length) {
			logger.info(`Restoring ${data.labAttachments.length} lab attachments...`);
			const affectedLabIds = Array.from(
				new Set<string>(
					data.labAttachments.map((r: { labId: string }) => r.labId),
				),
			);
			for (const labId of affectedLabIds) {
				await tx.delete(labAttachments).where(eq(labAttachments.labId, labId));
			}
			for (const row of data.labAttachments) {
				row.createdAt = new Date(row.createdAt);
				row.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
				await tx.insert(labAttachments).values(row);
			}
		}

		if (data.labEmbeddedFiles?.length) {
			logger.info(
				`Restoring ${data.labEmbeddedFiles.length} lab embedded files...`,
			);
			for (const row of data.labEmbeddedFiles) {
				await tx
					.insert(labEmbeddedFiles)
					.values(row)
					.onConflictDoUpdate({
						target: [labEmbeddedFiles.labId, labEmbeddedFiles.file],
						set: row,
					});
			}
		}
	});

	logger.info("Restore complete!");
}
