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
import { CreateDepartmentRequest } from '@vlab/shared/schemas';
import { useDepartmentActionStore } from '../../stores/department-action-store';

const validator = Compile(CreateDepartmentRequest);

export function CreateDepartmentModal() {
  const store = useDepartmentActionStore();
  const isOpen = store.use.create();
  const { setCreate } = store.use.actions();

  const queryClient = useQueryClient();
  const form = api.department.post.useForm({
    defaultValues: { name: '' },
    validators: { onSubmit: validator },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['department', 'pagination'],
        });
        setCreate(false);
        form.reset();
      },
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setCreate}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Department</DialogTitle>
          <DialogDescription>
            Create a new academic department.
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
                  label="Department Name"
                  placeholder="e.g., Computer Science"
                  required
                />
              )}
            </form.AppField>
            <form.AppForm>
              <form.SubmitButton label="Create Department" />
            </form.AppForm>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
