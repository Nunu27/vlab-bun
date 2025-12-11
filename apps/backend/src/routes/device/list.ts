import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";

export default createRouter().get(
	"/list",
	async ({ db }) => {
		const data = await db.query.deviceCategories.findMany({
			columns: {
				id: true,
				name: true,
				color: true
			},
			with: {
				devices: {
					columns: {
						id: true,
						name: true,
						icon: true,
						resources: true,
						interfaces: true
					}
				}
			}
		});

		return success({
			data
		});
	},
	{
		protected: true,
		cached: { key: "device:list" },
		detail: {
			description: "Get device list grouped by category"
		}
	}
);
