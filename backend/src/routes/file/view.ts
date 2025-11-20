import { createRouter } from "@backend/plugins/services";

export default createRouter().get(
	"/:name",
	async ({ params, storage, bucket, set, status }) => {
		const file = await storage
			.GetObject({ Bucket: bucket, Key: params.name })
			.catch(() => null);
		if (!file?.Body) {
			return status(404);
		}

		set.headers.etag = file.ETag || "";
		set.headers["content-type"] =
			file.ContentType || "application/octet-stream";
		set.headers["content-length"] = file.ContentLength;
		set.headers["last-modified"] = file.LastModified?.toISOString();

		return file.Body;
	},
	{
		protected: true,
		detail: {
			description: "Get a file"
		}
	}
);
