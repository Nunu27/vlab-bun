import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { CreateAdminRequest } from "@vlab/shared/schemas/admin";
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
import { useAdminModalStore } from "../../stores/admin-modal-store";

const validator = Compile(CreateAdminRequest);

export function CreateAdminModal() {
	const store = useAdminModalStore();
	const isOpen = store.use.create();
	const actions = store.use.actions();

	const queryClient = useQueryClient();

	const form = useApiForm(api.user.admin.post, {
		defaultValues: {
			name: "",
			email: "",
			password: "",
		},
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				api.user.admin.pagination.post.invalidateQuery(queryClient);
				actions.create.close();
				form.reset();
			},
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={actions.create.close}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Admin</DialogTitle>
					<DialogDescription>
						Create a new admin account with full access to the system.
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
									label="Admin Name"
									placeholder="e.g., Jane Smith"
									required
								/>
							)}
						</form.AppField>
						<form.AppField name="email">
							{(field) => (
								<field.TextField
									type="email"
									label="Email Address"
									placeholder="e.g., jane@example.com"
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
							<form.SubmitButton label="Create Admin" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
