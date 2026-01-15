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
import { UpdateStudyProgramRequest } from '@vlab/shared/schemas';
import { useStudyProgramActionStore } from '../../stores/study-program-action-store';
import { useEffect } from 'react';

const validator = Compile(UpdateStudyProgramRequest);

export function EditStudyProgramModal() {
  const store = useStudyProgramActionStore();
  const { open, data } = useActionState(store.use.update());
  const { setUpdate } = store.use.actions();

  const queryClient = useQueryClient();
  const form = api['study-program']({
    id: data?.id ?? '',
  }).put.useForm({
    defaultValues: {
      name: data?.name ?? '',
      departmentId: data?.department.id ?? '',
    },
    validators: { onSubmit: validator },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['study-program', 'pagination'],
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
          <DialogTitle>Edit Study Program</DialogTitle>
          <DialogDescription>
            Update study program information.
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
                  label="Study Program Name"
                  placeholder="e.g., Informatics Engineering"
                  required
                />
              )}
            </form.AppField>
            <form.AppField name="departmentId">
              {(field) => (
                <field.PaginatedComboBoxField
                  label="Department"
                  required
                  placeholder="Select department"
                  searchPlaceholder="Search departments..."
                  emptyMessage="No department found."
                  width="w-full"
                  allowClear
                  endpoint={api.department.pagination.get}
                  params={{
                    perPage: 20,
                  }}
                  renderOption={(item) => ({
                    value: item.id,
                    label: item.name,
                  })}
                />
              )}
            </form.AppField>
            <form.AppForm>
              <form.SubmitButton label="Update Study Program" />
            </form.AppForm>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
