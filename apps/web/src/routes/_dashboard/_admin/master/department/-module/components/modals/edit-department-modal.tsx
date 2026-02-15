import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { UpdateDepartmentRequest } from "@vlab/shared/schemas/department";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@web/components/ui/dialog";
import { FieldGroup } from "@web/components/ui/field";
import { useApiForm } from "@web/hooks/form/use-api-form";
import { useModalState } from "@web/hooks/state/use-modal-state";
import api from "@web/lib/api";
import { useEffect } from "react";
import { useDepartmentModalStore } from "../../stores/department-modal-store";

const validator = Compile(UpdateDepartmentRequest);

export function EditDepartmentModal() {
	const store = useDepartmentModalStore();
	const { open, data } = useModalState(store.use.update());
	const actions = store.use.actions();

	const queryClient = useQueryClient();
	const request = api.department({ id: data?.id ?? "" });
	const form = useApiForm(request.put, {
		defaultValues: { name: data?.name ?? "" },
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["department", "pagination"],
				});
				actions.update.close();
			},
		},
	});

	useEffect(() => {
		if (!data) form.reset();
	}, [data, form]);

	return (
		<Dialog open={open} onOpenChange={actions.update.close}>
			<DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
				<DialogHeader>
					<DialogTitle>Edit Department</DialogTitle>
					<DialogDescription>Update department information.</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.AppField name="name">
							{(field) => (
								<field.TextField
									label="Department Name"
									placeholder="e.g., Computer Science"
									required
								/>
							)}
						</form.AppField>
						<form.AppForm>
							<form.SubmitButton label="Update Department" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
