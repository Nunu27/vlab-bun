import path from "node:path";
import db from "@manager/db";
import { files } from "@manager/db/schema/file";
import { labAttachments, labEmbeddedFiles, labs } from "@manager/db/schema/lab";
import env from "@manager/env";
import logger from "@manager/lib/logger";
import { and, eq, inArray, isNotNull, lt, notExists } from "drizzle-orm";
import { S3mini } from "s3mini";

const storage = new S3mini({
	accessKeyId: env.S3_ACCESS_KEY,
	secretAccessKey: env.S3_SECRET_KEY,
	endpoint: env.S3_ENDPOINT,
	requestAbortTimeout: 5000,
});

export default storage;

function getUniqueFilename(name: string, buffer: Buffer) {
	const hash = new Bun.CryptoHasher("sha256").update(buffer).digest();
	const base64url = hash
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
	const ext = path.extname(name);

	return `${base64url}${ext}`;
}

export async function uploadFile(file: File) {
	const fileBuffer = Buffer.from(await file.arrayBuffer());
	const name = getUniqueFilename(file.name, fileBuffer);

	const id = await db.transaction(async (tx) => {
		const newId = Bun.randomUUIDv7();

		const [insertedFile] = await tx
			.insert(files)
			.values({
				id: newId,
				name,
			})
			.onConflictDoUpdate({
				target: files.name,
				set: { updatedAt: new Date() },
			})
			.returning({ id: files.id });

		// If the returned id matches what we generated, it's a new insert => upload
		if (insertedFile.id === newId) {
			const res = await storage.putObject(name, fileBuffer, file.type);
			if (!res.ok) throw new Error(`Failed to upload file to storage`);
		}

		return insertedFile.id;
	});

	return { id, name };
}

export async function storageCleanup() {
	await db.transaction(async (tx) => {
		const cutoff = new Date(
			Date.now() - 1000 * 60 * 60 * env.STORAGE_CLEANUP_WINDOW_HOURS,
		);

		const filesToDelete = await tx.query.files.findMany({
			columns: { name: true },
			where: (f) =>
				and(
					lt(f.updatedAt, cutoff),
					notExists(
						tx
							.select()
							.from(labs)
							.where(and(isNotNull(labs.cover), eq(labs.cover, f.name))),
					),
					notExists(
						tx
							.select()
							.from(labAttachments)
							.where(eq(labAttachments.file, f.name)),
					),
					notExists(
						tx
							.select()
							.from(labEmbeddedFiles)
							.where(eq(labEmbeddedFiles.file, f.name)),
					),
				),
		});

		const names = filesToDelete.map((f) => f.name);
		if (!names.length) return;

		logger.info("Found %d orphaned files, deleting...", names.length);
		const statuses = await storage.deleteObjects(names);
		const deleted = names.filter((_, i) => statuses[i]);

		if (deleted.length) {
			await tx.delete(files).where(inArray(files.name, deleted));
			logger.info("Deleted %d files from storage and database", deleted.length);
		} else {
			logger.info("No files were deleted from storage");
		}
	});
}
