import type { ErrorResponse, SuccessResponse } from "@vlab/shared/types";

export const success = <
	TData extends unknown = undefined,
	TMessage extends string | undefined = undefined
>({
	data,
	message
}: {
	data?: TData;
	message?: TMessage;
} = {}) => {
	return {
		success: true as const,
		...(data !== undefined && { data }),
		...(message !== undefined && { message })
	} as SuccessResponse<TData>;
};

export const failure = <
	TMessage extends string,
	TErrors extends unknown = undefined
>({
	errors,
	message
}: {
	errors?: TErrors[];
	message: TMessage;
}) => {
	return {
		success: false as const,
		message,
		...(errors !== undefined && { errors })
	} as ErrorResponse;
};
