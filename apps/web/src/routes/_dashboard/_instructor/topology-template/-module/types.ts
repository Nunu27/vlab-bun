import type { ExtractTreatyPaginationData } from "@jawit/query/types";
import type api from "@web/lib/api";

type PaginationRequest = (typeof api)["topology-template"]["pagination"];

export type TopologyTemplateItem =
	ExtractTreatyPaginationData<PaginationRequest> & { index: number };
