import type {
	ExtractTreatyData,
	ExtractTreatyPaginationData,
} from "@jawit/query/types";
import type api from "@web/lib/api";

type LabPaginationRequest = (typeof api)["lab"]["pagination"];
type LabEnrollmentListRequest = ReturnType<
	(typeof api)["lab"]
>["enrollment"]["get"];
type LabDetailRequest = ReturnType<(typeof api)["lab"]>["get"];

export type LabItem = ExtractTreatyPaginationData<LabPaginationRequest>;
export type LabEnrollmentItem =
	ExtractTreatyData<LabEnrollmentListRequest>[number] & {
		index: number;
	};
export type LabDetail = ExtractTreatyData<LabDetailRequest>;
