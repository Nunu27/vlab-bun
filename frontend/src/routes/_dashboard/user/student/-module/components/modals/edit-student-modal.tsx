import { UpdateStudentRequest } from '@backend/routes/user/student/schema';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@frontend/components/ui/select';
import { ComboBox } from '@frontend/components/ui/combobox';
import api from '@frontend/lib/api';
import { getErrorMessageFromApi } from '@frontend/lib/utils';
import { Compile } from '@sinclair/typemap';
import { useForm } from '@tanstack/react-form';
import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import { degreeLevelEnum } from '@backend/db/schema';
import type { ExtractPaginationData } from '@frontend/lib/api-types';

type Item = ExtractPaginationData<typeof api.user.student.pagination>;
type DegreeLevel = Item['degreeLevel'];

interface EditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Item;
}

export function EditStudentModal({
  open,
  onOpenChange,
  student,
}: EditStudentModalProps) {
  const [studyProgramSearch, setStudyProgramSearch] = useState('');
  const queryClient = useQueryClient();

  const updateStudent = useMutation({
    mutationFn: async (data: typeof UpdateStudentRequest.static) => {
      const result = await api.user.student({ id: student.id }).put(data);

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success('Student updated successfully');
      queryClient.invalidateQueries({
        queryKey: ['student', 'pagination'],
        exact: false,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update student');
    },
  });

  const {
    data: studyProgramData,
    fetchNextPage,
    hasNextPage,
    isFetching: isLoadingStudyPrograms,
  } = useInfiniteQuery({
    enabled: open,
    queryKey: ['study-program', 'pagination', studyProgramSearch],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await api['study-program'].pagination.post({
        page: pageParam,
        perPage: 20,
        search: studyProgramSearch || undefined,
      });

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pageInfo.page < lastPage.pageInfo.totalPages) {
        return lastPage.pageInfo.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  const studyProgramOptions = useMemo(() => {
    return (
      studyProgramData?.pages.flatMap((page) =>
        page.items.map((item) => ({
          value: item.id,
          label: item.name,
        })),
      ) ?? []
    );
  }, [studyProgramData]);

  const form = useForm({
    defaultValues: {
      name: student.name,
      email: student.email,
      nrp: student.nrp,
      year: student.year,
      degreeLevel: student.degreeLevel,
      studyProgramId: student.studyProgram.id,
    },
    validators: {
      onSubmit: Compile(UpdateStudentRequest),
    },
    onSubmit: async ({ value }) => {
      updateStudent.mutate(value);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      Name
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="John Doe"
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
            <form.Field name="email">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      Email
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      placeholder="m@example.com"
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
            <form.Field name="nrp">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      NRP
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="1234567890"
                      maxLength={10}
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
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="year">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field>
                      <FieldLabel htmlFor={field.name} required>
                        Year
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        placeholder={new Date().getFullYear().toString()}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(Number.parseInt(e.target.value))
                        }
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="degreeLevel">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field>
                      <FieldLabel htmlFor={field.name} required>
                        Degree Level
                      </FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(value as DegreeLevel)
                        }
                      >
                        <SelectTrigger
                          id={field.name}
                          aria-invalid={isInvalid}
                          onBlur={field.handleBlur}
                        >
                          <SelectValue placeholder="Select degree level" />
                        </SelectTrigger>
                        <SelectContent>
                          {degreeLevelEnum.enumValues.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </div>
            <form.Field name="studyProgramId">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      Study Program
                    </FieldLabel>
                    <ComboBox
                      options={studyProgramOptions}
                      value={field.state.value}
                      onChange={(value) => field.handleChange(value ?? '')}
                      placeholder="Select study program"
                      searchPlaceholder="Search study programs..."
                      emptyMessage="No study program found."
                      width="w-full"
                      allowClear
                      isLoading={isLoadingStudyPrograms}
                      hasMore={hasNextPage}
                      onLoadMore={() => fetchNextPage()}
                      onSearchChange={setStudyProgramSearch}
                      shouldFilter={false}
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
                    {isSubmitting ? 'Updating...' : 'Update Student'}
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
