import { Compile } from "@sinclair/typemap";
import { ChangePasswordRequest } from "@vlab/shared/schemas/user";
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
import { useUserPasswordModalStore } from "../../stores/user-password-modal-store";

const validator = Compile(ChangePasswordRequest);

export function ChangePasswordModal() {
	const store = useUserPasswordModalStore();
	const { open, data } = useModalState(store.use.changePassword());
	const actions = store.use.actions();

	const form = useApiForm(
		api.user({ id: data?.id ?? "" })["change-password"].post,
		{
			defaultValues: {
				newPassword: "",
				confirmPassword: "",
			},
			validators: { onSubmit: validator },
			mutation: {
				onSuccess: () => {
					actions.changePassword.close();
					form.reset();
				},
			},
		},
	);

	return (
		<Dialog open={open} onOpenChange={actions.changePassword.close}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Change Password</DialogTitle>
					<DialogDescription>
						Change password for {data?.name || "this user"}.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.AppField name="newPassword">
							{(field) => (
								<field.TextField
									type="password"
									label="New Password"
									placeholder="Enter new password"
									required
								/>
							)}
						</form.AppField>
						<form.AppField name="confirmPassword">
							{(field) => (
								<field.TextField
									type="password"
									label="Confirm Password"
									placeholder="Re-enter new password"
									required
								/>
							)}
						</form.AppField>
						<form.AppForm>
							<form.SubmitButton label="Change Password" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
