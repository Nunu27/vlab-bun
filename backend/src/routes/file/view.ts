import { createRouter } from "@backend/plugins/services";

export default createRouter().get(
	"/:name",
	async ({ session, params, storage, bucket, set, status }) => {
		if (!session) return status(401);

		let file;

		try {
			file = await storage.GetObject({ Bucket: bucket, Key: params.name });
		} catch (error) {
			return status(500);
		}
		if (!file?.Body) return status(404);

		const {
			ETag = "",
			ContentType = "application/octet-stream",
			ContentLength,
			LastModified
		} = file;

		set.headers.etag = ETag;
		set.headers["content-type"] = ContentType;
		set.headers["content-length"] = ContentLength;
		set.headers["last-modified"] = LastModified?.toISOString();

		return file.Body;
	},
	{
		protected: false,
		detail: {
			description: "Get a file"
		}
	}
);
