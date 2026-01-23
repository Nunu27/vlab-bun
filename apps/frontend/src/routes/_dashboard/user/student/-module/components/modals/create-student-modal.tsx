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
import { degreeLevelEnum } from '@vlab/shared/enums';
import { CreateStudentRequest } from '@vlab/shared/schemas/rest';
import { useStudentActionStore } from '../../stores/student-action-store';

const validator = Compile(CreateStudentRequest);

export function CreateStudentModal() {
  const store = useStudentActionStore();
  const open = store.use.create();
  const { setCreate } = store.use.actions();

  const queryClient = useQueryClient();
  const form = api.user.student.post.useForm({
    defaultValues: {
      name: '',
      email: '',
      nrp: '',
      year: new Date().getFullYear(),
      degreeLevel: 'D4',
      studyProgramId: '',
      password: '',
    },
    validators: { onSubmit: validator },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['user', 'student', 'pagination'],
        });
        setCreate(false);
        form.reset();
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={() => setCreate(false)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Student</DialogTitle>
          <DialogDescription>
            Create a new student account with login credentials.
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
            <form.AppField name="password">
              {(field) => (
                <field.TextField
                  label="Password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  required
                />
              )}
            </form.AppField>
            <form.AppForm>
              <form.SubmitButton label="Create Student" />
            </form.AppForm>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
