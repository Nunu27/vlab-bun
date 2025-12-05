import { CreateStudyProgramRequest } from '@backend/routes/study-program/schema';
import { Button } from '@frontend/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Compile } from '@sinclair/typemap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessageFromApi } from '@frontend/lib/utils';
import { PlusIcon } from 'lucide-react';

export function CreateStudyProgramModal() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createStudyProgram = useMutation({
    mutationFn: async (data: typeof CreateStudyProgramRequest.static) => {
      const result = await api['study-program'].post(data);

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: ['study-program', 'pagination'],
        exact: false,
      });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      name: '',
      departmentId: '',
    },
    validators: {
      onSubmit: Compile(CreateStudyProgramRequest),
    },
    onSubmit: ({ value }) => createStudyProgram.mutateAsync(value),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <PlusIcon /> Create Study Program
        </Button>
      </DialogTrigger>
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
                    {isSubmitting ? 'Creating...' : 'Create Study Program'}
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
