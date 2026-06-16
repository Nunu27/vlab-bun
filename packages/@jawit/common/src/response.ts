import type { FailureResponse, SuccessResponse } from "./types";

export function success<
	const T = undefined,
	const M extends string | undefined = undefined,
>(options?: { data?: T; message?: M }): SuccessResponse<T, M> {
	return {
		success: true,
		...(options?.data !== undefined ? { data: options.data } : {}),
		...(options?.message !== undefined ? { message: options.message } : {}),
	} as unknown as SuccessResponse<T, M>;
}

export function failure<
	const E = undefined,
	const M extends string | undefined = undefined,
>(options?: { errors?: E; message?: M }): FailureResponse<E, M> {
	return {
		success: false,
		...(options?.message !== undefined ? { message: options.message } : {}),
		...(options?.errors !== undefined ? { errors: options.errors } : {}),
	} as FailureResponse<E, M>;
}

export const responses = {
	notFound: (label: string) => failure({ message: `${label} not found` }),
	deleted: (label: string) => success({ message: `${label} deleted` }),
	created: <const T>(label: string, data: T) =>
		success({ message: `${label} created`, data }),
	updated: (label: string) => success({ message: `${label} updated` }),
};
