import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { CreateDeviceCategoryRequest } from "@vlab/shared/schemas/device-category";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@web/components/ui/dialog";
import { FieldGroup } from "@web/components/ui/field";
import { useApiForm } from "@web/hooks/form/use-api-form";
import api from "@web/lib/api";
import { useDeviceCategoryModalStore } from "../../stores/device-category-modal-store";

const validator = Compile(CreateDeviceCategoryRequest);

export function CreateDeviceCategoryModal() {
	const store = useDeviceCategoryModalStore();
	const isOpen = store.use.create();
	const actions = store.use.actions();

	const queryClient = useQueryClient();

	const form = useApiForm(api["device-category"].post, {
		defaultValues: { name: "", color: "#000000" },
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				api["device-category"].pagination.post.invalidateQuery(queryClient);
				actions.create.close();
				form.reset();
			},
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={actions.create.close}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Device Category</DialogTitle>
					<DialogDescription>
						Create a new device category to cluster device templates.
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
							<form.SubmitButton label="Create Category" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
