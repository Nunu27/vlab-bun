import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import { FieldGroup } from '@frontend/components/ui/field';
import { useActionState } from '@frontend/hooks/use-action-state';
import api from '@frontend/lib/api';
import { Compile } from '@sinclair/typemap';
import { AuthChangePasswordRequest } from '@vlab/shared/schemas';
import { useEffect } from 'react';
import { useDashboardActionStore } from '../../stores/dashboard-action-store';

const validator = Compile(AuthChangePasswordRequest);

export function ChangePasswordModal() {
  const store = useDashboardActionStore();
  const { open, data } = useActionState(store.use.changePassword());
  const { setChangePassword } = store.use.actions();

  const form = api.auth['change-password'].post.useForm({
    defaultValues: {
      oldPassword: data?.casOnly ? null : '',
      newPassword: '',
      confirmPassword: '',
    },
    validators: { onSubmit: validator },
    mutation: {
      onSuccess: () => {
        setChangePassword(null);
      },
    },
  });

  useEffect(() => {
    if (!data) form.reset();
  }, [data, form]);

  return (
    <Dialog open={open} onOpenChange={() => setChangePassword(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Change your account password.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            {!data?.casOnly && (
              <form.AppField name="oldPassword">
                {(field) => (
                  <field.TextField
                    label="Old Password"
                    type="password"
                    placeholder="Enter current password"
                    autoComplete="current-password"
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
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  required
                />
              )}
            </form.AppField>
            <form.AppField name="confirmPassword">
              {(field) => (
                <field.TextField
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter password"
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
