import type { ExtractTreatyPaginationData } from "@jawit/query/types";
import type api from "@web/lib/api";

type PaginationRequest = (typeof api)["device-category"]["pagination"];

export type DeviceCategoryItem = ExtractTreatyPaginationData<PaginationRequest>;
