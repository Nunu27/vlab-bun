import type { Treaty } from "@elysiajs/eden";
import type { BaseResponse } from "@jawit/common";
import type { ExtractTreatyResponse } from "@jawit/query/types";
import { redirect } from "@tanstack/react-router";
import { toast } from "sonner";

type ResponseWithMessage = BaseResponse<unknown, unknown, string>;

export function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === "string") {
		return error;
	}

	return "An error occurred";
}

export function getErrorMessageFromApi(error: unknown) {
	return (error as ResponseWithMessage).message || "An error occurred";
}

interface ErrorHandlerConfig<TResponse> {
	showToast?: {
		onSuccess?: boolean;
		onError?: boolean;
	};
	callback?: (response: TResponse) => void | Promise<void>;
}

export async function errorHandler<
	TRes extends Record<number, unknown>,
	TPromise extends Promise<Treaty.TreatyResponse<TRes>>,
	TResponse extends ExtractTreatyResponse<() => TPromise>,
>(promise: TPromise, config: ErrorHandlerConfig<TResponse> = {}) {
	const { showToast = {}, callback } = config;

	try {
		const { data, error } = await promise;

		if (error) {
			const { status, value } = error;

			if (
				status === 401 &&
				(value as ResponseWithMessage).message === "Unauthorized"
			) {
				await cookieStore.delete("session");
				toast.error("Session expired");
				redirect({ to: "/login" });
				return;
			}

			throw new Error(getErrorMessageFromApi(value));
		}

		if (showToast.onSuccess ?? true) {
			const response = data as ResponseWithMessage;

			if (response && typeof response === "object" && response.message) {
				toast.success(response.message);
			}
		}

		await callback?.(data as TResponse);
	} catch (error) {
		if (showToast.onError ?? true) {
			toast.error(getErrorMessage(error));
		}
	}
}
