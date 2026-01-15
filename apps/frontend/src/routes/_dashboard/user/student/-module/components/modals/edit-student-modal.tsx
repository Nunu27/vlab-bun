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
import { degreeLevelEnum } from '@vlab/shared/enums';
import { UpdateStudentRequest } from '@vlab/shared/schemas';
import { useStudentActionStore } from '../../stores/student-action-store';

const validator = Compile(UpdateStudentRequest);

export function EditStudentModal() {
  const store = useStudentActionStore();
  const { open, data } = useActionState(store.use.update());
  const { setUpdate } = store.use.actions();

  const queryClient = useQueryClient();
  const form = api.user.student({ id: data?.id ?? '' }).put.useForm({
    defaultValues: {
      name: data?.name ?? '',
      email: data?.email ?? '',
      nrp: data?.nrp ?? '',
      year: data?.year ?? new Date().getFullYear(),
      degreeLevel: data?.degreeLevel ?? 'D4',
      studyProgramId: data?.studyProgram.id ?? '',
    },
    validators: { onSubmit: validator },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['user', 'student', 'pagination'],
        });
        queryClient.invalidateQueries({
          queryKey: ['user', 'student', { id: data?.id ?? '' }],
        });
        setUpdate(null);
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={() => setUpdate(null)}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>Update student information.</DialogDescription>
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
            <form.AppField name="nrp">
              {(field) => (
                <field.TextField
                  label="NRP"
                  placeholder="1234567890"
                  required
                />
              )}
            </form.AppField>
            <div className="grid grid-cols-2 gap-4">
              <form.AppField name="year">
                {(field) => (
                  <field.TextField label="Year" type="number" required />
                )}
              </form.AppField>
              <form.AppField name="degreeLevel">
                {(field) => (
                  <field.SelectField
                    label="Degree Level"
                    placeholder="Select degree level"
                    options={degreeLevelEnum}
                    required
                  />
                )}
              </form.AppField>
            </div>
            <form.AppField name="studyProgramId">
              {(field) => (
                <field.PaginatedComboBoxField
                  label="Study Program"
                  required
                  placeholder="Select study program"
                  searchPlaceholder="Search study programs..."
                  emptyMessage="No study program found."
                  width="w-full"
                  allowClear
                  endpoint={api['study-program'].pagination.get}
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
              <form.SubmitButton label="Update Student" />
            </form.AppForm>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
