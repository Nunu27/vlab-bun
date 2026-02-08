import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { CreateInstructorRequest } from "@vlab/shared/schemas/instructor";
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
import { useInstructorModalStore } from "../../stores/instructor-modal-store";

const validator = Compile(CreateInstructorRequest);

export function CreateInstructorModal() {
	const store = useInstructorModalStore();
	const isOpen = store.use.create();
	const actions = store.use.actions();

	const queryClient = useQueryClient();

	const form = useApiForm(api.user.instructor.post, {
		defaultValues: {
			name: "",
			email: "",
			password: "",
			nip: "",
		},
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["user", "instructor", "pagination"],
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
					<DialogTitle>Add Instructor</DialogTitle>
					<DialogDescription>
						Register a new instructor account in the platform.
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
						<form.AppField name="password">
							{(field) => (
								<field.TextField
									type="password"
									label="Password"
									placeholder="Enter password"
									required
								/>
							)}
						</form.AppField>
						<form.AppForm>
							<form.SubmitButton label="Register Instructor" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
