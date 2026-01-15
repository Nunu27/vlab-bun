import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import { FieldGroup } from '@frontend/components/ui/field';
import api from '@frontend/lib/api';
import { Compile } from '@sinclair/typemap';
import { useQueryClient } from '@tanstack/react-query';
import { CreateLecturerRequest } from '@vlab/shared/schemas';
import { useLecturerActionStore } from '../../stores/lecturer-action-store';

const validator = Compile(CreateLecturerRequest);

export function CreateLecturerModal() {
  const store = useLecturerActionStore();
  const open = store.use.create();
  const { setCreate } = store.use.actions();

  const queryClient = useQueryClient();
  const form = api.user.lecturer.post.useForm({
    defaultValues: {
      name: '',
      email: '',
      nip: '',
      password: '',
    },
    validators: { onSubmit: validator },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['lecturer', 'pagination'] });
        setCreate(false);
        form.reset();
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={() => setCreate(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Lecturer</DialogTitle>
          <DialogDescription>
            Create a new lecturer account with login credentials.
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
            <form.AppField name="password">
              {(field) => (
                <field.TextField
                  label="Password"
                  placeholder="Minimum 8 characters"
                  type="password"
                  required
                />
              )}
            </form.AppField>
            <form.AppForm>
              <form.SubmitButton label="Create" />
            </form.AppForm>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
