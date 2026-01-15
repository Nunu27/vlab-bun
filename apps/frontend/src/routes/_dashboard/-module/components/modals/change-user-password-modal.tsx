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
import { ChangePasswordRequest } from '@vlab/shared/schemas';
import { useEffect } from 'react';
import { useDashboardActionStore } from '../../stores/dashboard-action-store';

const validator = Compile(ChangePasswordRequest);

export function ChangeUserPasswordModal() {
  const store = useDashboardActionStore();
  const { open, data } = useActionState(store.use.changeUserPassword());
  const { setChangeUserPassword } = store.use.actions();

  const request = api.user({ id: data?.id ?? '' })['change-password'];
  const form = request.post.useForm({
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validators: { onSubmit: validator },
    mutation: {
      onSuccess: () => {
        setChangeUserPassword(null);
      },
    },
  });

  useEffect(() => {
    if (!data) form.reset();
  }, [data, form]);

  return (
    <Dialog open={open} onOpenChange={() => setChangeUserPassword(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Change password for <strong>{data?.name}</strong>.
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
