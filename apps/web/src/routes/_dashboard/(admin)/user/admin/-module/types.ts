import type { ExtractTreatyData } from "@jawit/query/types";
import type api from "@web/lib/api";

type AdminData = ExtractTreatyData<typeof api.user.admin.pagination.post>;

export type AdminItem = AdminData["items"][0];
