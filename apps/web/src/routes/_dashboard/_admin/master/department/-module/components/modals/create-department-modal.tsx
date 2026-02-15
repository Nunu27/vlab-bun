import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { CreateDepartmentRequest } from "@vlab/shared/schemas/department";
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
import { useDepartmentModalStore } from "../../stores/department-modal-store";

const validator = Compile(CreateDepartmentRequest);

export function CreateDepartmentModal() {
	const store = useDepartmentModalStore();
	const isOpen = store.use.create();
	const actions = store.use.actions();

	const queryClient = useQueryClient();

	const form = useApiForm(api.department.post, {
		defaultValues: { name: "" },
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["department", "pagination"],
				});
				actions.create.close();
				form.reset();
			},
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={actions.create.close}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Department</DialogTitle>
					<DialogDescription>
						Create a new academic department.
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
									label="Department Name"
									placeholder="e.g., Computer Science"
									required
								/>
							)}
						</form.AppField>
						<form.AppForm>
							<form.SubmitButton label="Create Department" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
