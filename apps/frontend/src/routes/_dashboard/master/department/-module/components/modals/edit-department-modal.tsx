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
import { UpdateDepartmentRequest } from '@vlab/shared/schemas';
import { useDepartmentActionStore } from '../../stores/department-action-store';
import { useEffect } from 'react';

const validator = Compile(UpdateDepartmentRequest);

export function EditDepartmentModal() {
  const store = useDepartmentActionStore();
  const { open, data } = useActionState(store.use.update());
  const { setUpdate } = store.use.actions();

  const queryClient = useQueryClient();
  const request = api.department({ id: data?.id ?? '' });
  const form = request.put.useForm({
    defaultValues: { name: data?.name ?? '' },
    validators: { onSubmit: validator },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['department', 'pagination'],
        });
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
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>Update department information.</DialogDescription>
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
              <form.SubmitButton label="Update Department" />
            </form.AppForm>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
