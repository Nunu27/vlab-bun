export interface PageInfo {
	page: number;
	perPage: number;
	total: number;
	totalPages: number;
}

export interface PaginatedData<T> {
	items: T[];
	pageInfo: PageInfo;
}

export type SuccessResponse<T> = {
	success: true;
	data: T;
	message?: string;
};

export type ErrorResponse = {
	success: false;
	message: string;
	errors?: unknown[];
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
