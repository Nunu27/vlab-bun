/** biome-ignore-all lint/suspicious/noExplicitAny: Intentional any for generic function extraction */
import type {
	ExtractTreatyData,
	ExtractTreatyError,
	ExtractTreatyParams,
} from "@jawit/query/types";
import type { FormOptions } from "@tanstack/react-form";
import type {
	UseMutationOptions,
	UseMutationResult,
} from "@tanstack/react-query";
import type { BaseApiFunction } from "@web/types";
import { useAppForm } from "./use-app-form";

type GenericMutationOptions<TFn extends BaseApiFunction> = Omit<
	UseMutationOptions<
		ExtractTreatyData<TFn>,
		ExtractTreatyError<TFn>,
		ExtractTreatyParams<TFn>
	>,
	"mutationFn"
>;

type ApiMutationEndpoint<TFn extends BaseApiFunction> = {
	useMutation(
		options?: GenericMutationOptions<TFn>,
	): UseMutationResult<
		ExtractTreatyData<TFn>,
		ExtractTreatyError<TFn>,
		ExtractTreatyParams<TFn>
	>;
};

type GenericFormOptions<TFormData> = FormOptions<
	TFormData,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

export function useApiForm<
	TFn extends BaseApiFunction,
	TData extends ExtractTreatyParams<TFn> = ExtractTreatyParams<TFn>,
>(
	endpoint: TFn & ApiMutationEndpoint<TFn>,
	options?: Omit<GenericFormOptions<TData>, "onSubmit"> & {
		mutation?: GenericMutationOptions<TFn>;
	},
) {
	const mutation = endpoint.useMutation(options?.mutation);

	const { mutation: _, ...formOptions } = options || {};

	return useAppForm<
		TData,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any
	>({
		...formOptions,
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(value);
		},
	});
}
