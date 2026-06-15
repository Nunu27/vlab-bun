import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { CreateStudyProgramRequest } from "@vlab/shared/schemas/study-program";
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
import { useStudyProgramModalStore } from "../../stores/study-program-modal-store";

const validator = Compile(CreateStudyProgramRequest);

export function CreateStudyProgramModal() {
	const store = useStudyProgramModalStore();
	const isOpen = store.use.create();
	const actions = store.use.actions();

	const queryClient = useQueryClient();

	const form = useApiForm(api["study-program"].post, {
		defaultValues: { name: "", departmentId: "" },
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				api["study-program"].pagination.post.invalidateQuery(queryClient);
				actions.create.close();
				form.reset();
			},
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={actions.create.close}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Study Program</DialogTitle>
					<DialogDescription>
						Create a new study program constraint to a department.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.AppField name="departmentId">
							{(field) => (
								<field.PaginatedComboboxField
									label="Department"
									placeholder="Select department..."
									endpoint={api.department.pagination}
									getLabel={(d) => d.name}
									getValue={(d) => d.id}
									required
								/>
							)}
						</form.AppField>
						<form.AppField name="name">
							{(field) => (
								<field.TextField
									label="Study Program Name"
									placeholder="e.g., Information Technology"
									required
								/>
							)}
						</form.AppField>
						<form.AppForm>
							<form.SubmitButton label="Create Study Program" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
