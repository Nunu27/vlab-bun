import type { ExtractTreatyPaginationData } from "@jawit/query/types";
import type api from "@web/lib/api";

type PaginationRequest = (typeof api)["department"]["pagination"];

export type DepartmentItem = ExtractTreatyPaginationData<PaginationRequest>;
// export type DepartmentFields = ExtractFields<PaginationRequest>;
// export type DepartmentFilters = ExtractFilters<PaginationRequest>;
