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
import { useQueryClient } from '@tanstack/react-query';
import { UpdateLecturerRequest } from '@vlab/shared/schemas';
import { useEffect } from 'react';
import { useLecturerActionStore } from '../../stores/lecturer-action-store';

const validator = Compile(UpdateLecturerRequest);

export function EditLecturerModal() {
  const store = useLecturerActionStore();
  const { open, data } = useActionState(store.use.update());
  const { setUpdate } = store.use.actions();

  const queryClient = useQueryClient();
  const form = api.user.lecturer({ id: data?.id ?? '' }).put.useForm({
    defaultValues: {
      name: data?.name ?? '',
      email: data?.email ?? '',
      nip: data?.nip ?? '',
    },
    validators: { onSubmit: validator },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['lecturer', 'pagination'] });
        setUpdate(null);
      },
    },
  });

  useEffect(() => {
    if (!data) form.reset();
  }, [data, form]);

  return (
    <Dialog open={open} onOpenChange={() => setUpdate(null)}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Lecturer</DialogTitle>
          <DialogDescription>Update lecturer information.</DialogDescription>
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
                <field.TextField label="Name" placeholder="John Doe" required />
              )}
            </form.AppField>
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label="Email"
                  placeholder="m@example.com"
                  required
                />
              )}
            </form.AppField>
            <form.AppField name="nip">
              {(field) => (
                <field.TextField label="NIP" placeholder="123456789" required />
              )}
            </form.AppField>
            <form.AppForm>
              <form.SubmitButton label="Update" />
            </form.AppForm>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
