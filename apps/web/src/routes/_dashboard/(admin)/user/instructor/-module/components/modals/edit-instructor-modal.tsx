import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { UpdateInstructorRequest } from "@vlab/shared/schemas/instructor";
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
import { useInstructorModalStore } from "../../stores/instructor-modal-store";

const validator = Compile(UpdateInstructorRequest);

export function EditInstructorModal() {
	const store = useInstructorModalStore();
	const { open, data } = useModalState(store.use.update());
	const actions = store.use.actions();

	const queryClient = useQueryClient();

	const form = useApiForm(api.user.instructor({ id: data?.id ?? "" }).put, {
		defaultValues: {
			name: data?.name ?? "",
			email: data?.email ?? "",
			nip: data?.nip ?? "",
		},
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["user", "instructor", "pagination"],
				});
				actions.update.close();
			},
		},
	});

	return (
		<Dialog open={open} onOpenChange={actions.update.close}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Update Instructor</DialogTitle>
					<DialogDescription>
						Update instructor profile and information.
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
									label="Instructor Name"
									placeholder="e.g., John Doe"
									required
								/>
							)}
						</form.AppField>
						<form.AppField name="email">
							{(field) => (
								<field.TextField
									type="email"
									label="Email Address"
									placeholder="e.g., john@example.com"
									required
								/>
							)}
						</form.AppField>
						<form.AppField name="nip">
							{(field) => (
								<field.TextField
									label="NIP (Employee ID)"
									placeholder="e.g., 12345678"
									required
								/>
							)}
						</form.AppField>
						<form.AppForm>
							<form.SubmitButton label="Update Instructor" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
