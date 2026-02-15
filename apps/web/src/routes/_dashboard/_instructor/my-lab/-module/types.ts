import type {
	ExtractTreatyData,
	ExtractTreatyPaginationData,
} from "@jawit/query/types";
import type api from "@web/lib/api";

type LabPaginationRequest = (typeof api)["lab"]["pagination"];
type LabEnrollmentPaginationRequest = ReturnType<
	(typeof api)["lab"]
>["enrollment"]["pagination"];
type LabDetailRequest = ReturnType<(typeof api)["lab"]>["get"];

export type LabItem = ExtractTreatyPaginationData<LabPaginationRequest>;
export type LabEnrollmentItem =
	ExtractTreatyPaginationData<LabEnrollmentPaginationRequest>;
export type LabDetail = ExtractTreatyData<LabDetailRequest>;
