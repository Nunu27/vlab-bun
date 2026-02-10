import { Compile } from "@sinclair/typemap";
import { AuthChangePasswordRequest } from "@vlab/shared/schemas/auth";
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
import { useAuthStore } from "@web/stores/auth-store";

const validator = Compile(AuthChangePasswordRequest);

interface ChangePasswordModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({
	open,
	onOpenChange,
}: ChangePasswordModalProps) {
	const casOnly = useAuthStore.use.user((user) => user?.casOnly);
	const form = useApiForm(api.auth["change-password"].post, {
		defaultValues: {
			oldPassword: casOnly ? null : "",
			newPassword: "",
			confirmPassword: "",
		},
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				onOpenChange(false);
				form.reset();
			},
		},
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(value) => {
				onOpenChange(value);
				if (!value) form.reset();
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Change Password</DialogTitle>
					<DialogDescription>Update your account password.</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						{!casOnly && (
							<form.AppField name="oldPassword">
								{(field) => (
									<field.TextField
										label="Old Password"
										type="password"
										placeholder="Enter your current password"
										required
									/>
								)}
							</form.AppField>
						)}
						<form.AppField name="newPassword">
							{(field) => (
								<field.TextField
									label="New Password"
									type="password"
									placeholder="Enter a new password"
									required
								/>
							)}
						</form.AppField>
						<form.AppField name="confirmPassword">
							{(field) => (
								<field.TextField
									label="Confirm New Password"
									type="password"
									placeholder="Re-enter your new password"
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
