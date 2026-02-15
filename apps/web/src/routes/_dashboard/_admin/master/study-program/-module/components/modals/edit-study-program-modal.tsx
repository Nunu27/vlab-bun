import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { UpdateStudyProgramRequest } from "@vlab/shared/schemas/study-program";
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
import { useStudyProgramModalStore } from "../../stores/study-program-modal-store";

const validator = Compile(UpdateStudyProgramRequest);

export function EditStudyProgramModal() {
	const store = useStudyProgramModalStore();
	const { open, data } = useModalState(store.use.update());
	const actions = store.use.actions();

	const queryClient = useQueryClient();
	const form = useApiForm(api["study-program"]({ id: data?.id ?? "" }).put, {
		defaultValues: {
			name: data?.name ?? "",
			departmentId: data?.department?.id ?? "",
		},
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["study-program", "pagination"],
				});
				actions.update.close();
			},
		},
	});

	return (
		<Dialog open={open} onOpenChange={actions.update.close}>
			<DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
				<DialogHeader>
					<DialogTitle>Edit Study Program</DialogTitle>
					<DialogDescription>
						Update study program information.
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
									defaultLabel={data?.department?.name}
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
							<form.SubmitButton label="Update Study Program" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
