import type { ExtractTreatyPaginationData } from "@jawit/query/types";
import type api from "@web/lib/api";

type PaginationRequest = (typeof api)["device-template"]["pagination"];

export type DeviceTemplateItem = ExtractTreatyPaginationData<PaginationRequest>;
