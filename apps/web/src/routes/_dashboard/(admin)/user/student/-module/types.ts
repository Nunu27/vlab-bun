import type { ExtractTreatyPaginationData } from "@jawit/query/types";
import type api from "@web/lib/api";

type PaginationRequest = (typeof api)["user"]["student"]["pagination"];

export type StudentItem = ExtractTreatyPaginationData<PaginationRequest>;
