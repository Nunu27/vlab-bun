/** biome-ignore-all lint/suspicious/noExplicitAny: intentional loose typing for proxy internals */
export type SuccessResponse<
	T = undefined,
	M extends string | undefined = undefined,
> = {
	success: true;
} & (T extends undefined ? unknown : { data: T }) &
	(M extends string ? { message: M } : unknown);

export type FailureResponse<
	E = undefined,
	M extends string | undefined = undefined,
> = {
	success: false;
} & (M extends string ? { message: M } : unknown) &
	(E extends undefined ? unknown : { errors: E });

export type BaseResponse<T = any, E = any, M extends string | undefined = any> =
	| SuccessResponse<T, M>
	| FailureResponse<E, M>;

export interface PaginatedData<T> {
	items: T[];
	pageInfo: {
		page: number;
		perPage: number;
		total: number;
		totalPages: number;
	};
}
