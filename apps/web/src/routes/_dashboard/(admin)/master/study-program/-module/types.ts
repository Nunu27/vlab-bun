import type { ExtractTreatyPaginationData } from "@jawit/query/types";
import type api from "@web/lib/api";

type PaginationRequest = (typeof api)["study-program"]["pagination"];

export type StudyProgramItem = ExtractTreatyPaginationData<PaginationRequest>;
