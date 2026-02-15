import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { UpdateDeviceCategoryRequest } from "@vlab/shared/schemas/device-category";
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
import { useDeviceCategoryModalStore } from "../../stores/device-category-modal-store";

const validator = Compile(UpdateDeviceCategoryRequest);

export function EditDeviceCategoryModal() {
	const store = useDeviceCategoryModalStore();
	const { open, data } = useModalState(store.use.update());
	const actions = store.use.actions();

	const queryClient = useQueryClient();

	const form = useApiForm(api["device-category"]({ id: data?.id ?? "" }).put, {
		defaultValues: {
			name: data?.name ?? "",
			color: data?.color ?? "#000000",
		},
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["device-category", "pagination"],
				});
				actions.update.close();
			},
		},
	});

	return (
		<Dialog open={open} onOpenChange={actions.update.close}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Device Category</DialogTitle>
					<DialogDescription>
						Apply changes to the device category.
					</DialogDescription>
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
									label="Category Name"
									placeholder="e.g., Router"
									required
								/>
							)}
						</form.AppField>
						<form.AppField name="color">
							{(field) => <field.ColorField label="Color" required />}
						</form.AppField>
						<form.AppForm>
							<form.SubmitButton label="Save Changes" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
