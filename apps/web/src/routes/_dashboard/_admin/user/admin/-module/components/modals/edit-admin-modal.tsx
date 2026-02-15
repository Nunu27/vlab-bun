import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { UpdateAdminRequest } from "@vlab/shared/schemas/admin";
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
import { useAdminModalStore } from "../../stores/admin-modal-store";

const validator = Compile(UpdateAdminRequest);

export function EditAdminModal() {
	const store = useAdminModalStore();
	const { open, data } = useModalState(store.use.update());
	const actions = store.use.actions();

	const queryClient = useQueryClient();

	const form = useApiForm(api.user.admin({ id: data?.id ?? "" }).put, {
		defaultValues: {
			name: data?.name ?? "",
			email: data?.email ?? "",
		},
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["user", "admin", "pagination"],
				});
				actions.update.close();
			},
		},
	});

	return (
		<Dialog open={open} onOpenChange={actions.update.close}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Update Admin</DialogTitle>
					<DialogDescription>Update admin profile details.</DialogDescription>
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
						<form.AppForm>
							<form.SubmitButton label="Update Admin" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
