import env from "@backend/env";
import awsLite from "@aws-lite/client";
import db from "@backend/db";
import logger from "./logger";
import { fileDependencies, files } from "@backend/db/schema/file";
import { inArray } from "drizzle-orm";
import path from "path";

const bucket = env.S3_BUCKET_NAME;
const aws = await awsLite({
	endpoint: env.S3_ENDPOINT,
	accessKeyId: env.S3_ACCESS_KEY,
	secretAccessKey: env.S3_SECRET_KEY,
	region: "auto",
	plugins: [import("@aws-lite/s3")]
});

export default aws.S3;

function getUniqueFilename(name: string, buffer: Buffer) {
	const length = 8;

	const hash = new Bun.CryptoHasher("sha256").update(buffer).digest();
	const base64url = hash
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
	const shortHash = base64url.slice(0, length);
	const ext = path.extname(name);

	return `${shortHash}${ext}`;
}

export async function uploadFile(file: File, from: string) {
	const fileBuffer = Buffer.from(await file.arrayBuffer());
	const name = getUniqueFilename(file.name, fileBuffer);

	const id = await db.transaction(async (tx) => {
		const [insertedFile] = await tx
			.insert(files)
			.values({
				name
			})
			.onConflictDoUpdate({ target: files.name, set: { unused: false } })
			.returning({ id: files.id });

		await tx
			.insert(fileDependencies)
			.values({
				file: name,
				name: from
			})
			.onConflictDoNothing();

		await aws.S3.PutObject({
			Bucket: bucket,
			Key: name,
			Body: fileBuffer,
			ContentType: file.type
		});

		return insertedFile.id;
	});

	return id;
}

export async function storageCleanup() {
	await db.transaction(async (tx) => {
		const fileToDelete = await tx.query.files.findMany({
			columns: { name: true },
			where(fields, operators) {
				return operators.eq(fields.unused, true);
			}
		});

		const names = fileToDelete.map((file) => file.name);
		if (!names.length) {
			return;
		}

		logger.info("Found %d unused files, deleting...", names.length);

		await tx.delete(files).where(inArray(files.name, names));
		await aws.S3.DeleteObjects({
			Bucket: env.S3_BUCKET_NAME,
			Delete: {
				Objects: names.map((name) => ({ Key: name })),
				Quiet: true
			}
		});

		logger.info("Deleted %d unused files", names.length);
	});
}
