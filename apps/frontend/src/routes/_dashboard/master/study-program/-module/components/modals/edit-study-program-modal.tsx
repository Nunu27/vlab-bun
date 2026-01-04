import { UpdateStudyProgramRequest } from '@vlab/shared/schemas';
import { Button } from '@frontend/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@frontend/components/ui/field';
import { Input } from '@frontend/components/ui/input';
import { PaginatedComboBox } from '@frontend/components/ui/combobox';
import api from '@frontend/lib/api';
import { getErrorMessageFromApi } from '@frontend/helper/error';
import { Compile } from '@sinclair/typemap';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EditStudyProgramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyProgramId: string;
  studyProgramName: string;
  studyProgramDepartmentId: string;
}

export function EditStudyProgramModal({
  open,
  onOpenChange,
  studyProgramId,
  studyProgramName,
  studyProgramDepartmentId,
}: EditStudyProgramModalProps) {
  const queryClient = useQueryClient();

  const updateStudyProgram = useMutation({
    mutationFn: async (data: typeof UpdateStudyProgramRequest.static) => {
      const result = await api['study-program']({ id: studyProgramId }).put(
        data,
      );

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: ['study-program', 'pagination'],
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      name: studyProgramName,
      departmentId: studyProgramDepartmentId,
    },
    validators: {
      onSubmit: Compile(UpdateStudyProgramRequest),
    },
    onSubmit: ({ value }) => updateStudyProgram.mutateAsync(value),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      Study Program Name
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="e.g., Informatics Engineering"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
            <form.Field name="departmentId">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      Department
                    </FieldLabel>
                    <PaginatedComboBox
                      value={field.state.value}
                      onChange={(value) => field.handleChange(value ?? '')}
                      placeholder="Select department"
                      searchPlaceholder="Search departments..."
                      emptyMessage="No department found."
                      width="w-full"
                      allowClear
                      queryKey={['department', 'pagination']}
                      fetcher={({ page, search }) =>
                        api.department.pagination.post({
                          page,
                          perPage: 20,
                          search: search || undefined,
                        })
                      }
                      renderOption={(item) => ({
                        value: item.id,
                        label: item.name,
                      })}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
            <Field>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? 'Updating...' : 'Update Study Program'}
                  </Button>
                )}
              </form.Subscribe>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
