import type { ExtractTreatyData } from "@jawit/query/types";
import type api from "@web/lib/api";

type InstructorData = ExtractTreatyData<
	typeof api.user.instructor.pagination.post
>;

export type InstructorItem = InstructorData["items"][0];
