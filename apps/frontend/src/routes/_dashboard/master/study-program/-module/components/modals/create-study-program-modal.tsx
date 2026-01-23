import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@frontend/components/ui/dialog';
import { FieldGroup } from '@frontend/components/ui/field';
import api from '@frontend/lib/api';
import { Compile } from '@sinclair/typemap';
import { useQueryClient } from '@tanstack/react-query';
import { CreateStudyProgramRequest } from '@vlab/shared/schemas/rest';
import { useStudyProgramActionStore } from '../../stores/study-program-action-store';

const validator = Compile(CreateStudyProgramRequest);

export function CreateStudyProgramModal() {
  const store = useStudyProgramActionStore();
  const open = store.use.create();
  const { setCreate } = store.use.actions();

  const queryClient = useQueryClient();
  const form = api['study-program'].post.useForm({
    defaultValues: {
      name: '',
      departmentId: '',
    },
    validators: { onSubmit: validator },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['study-program', 'pagination'],
        });
        setCreate(false);
        form.reset();
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={setCreate}>
      <DialogTrigger asChild></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Study Program</DialogTitle>
          <DialogDescription>
            Create a new study program under a department.
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
              <form.SubmitButton label="Create Study Program" />
            </form.AppForm>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
