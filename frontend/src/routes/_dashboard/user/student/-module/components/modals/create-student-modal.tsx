import { CreateStudentRequest } from '@backend/routes/user/student/schema';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@frontend/components/ui/select';
import { ComboBox } from '@frontend/components/ui/combobox';
import api from '@frontend/lib/api';
import { Compile } from '@sinclair/typemap';
import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { PlusIcon } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { getErrorMessageFromApi } from '@frontend/lib/utils';
import { degreeLevelEnum } from '@backend/db/schema';

type DegreeLevel = (typeof degreeLevelEnum.enumValues)[number];

export function CreateStudentModal() {
  const [open, setOpen] = useState(false);
  const [studyProgramSearch, setStudyProgramSearch] = useState('');
  const queryClient = useQueryClient();

  const createStudent = useMutation({
    mutationFn: async (data: typeof CreateStudentRequest.static) => {
      const result = await api.user.student.post(data);

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: ['student', 'pagination'],
        exact: false,
      });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
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
      name: '',
      email: '',
      nrp: '',
      year: new Date().getFullYear(),
      degreeLevel: 'D4' as DegreeLevel,
      studyProgramId: '',
      password: '',
    },
    validators: {
      onSubmit: Compile(CreateStudentRequest),
    },
    onSubmit: ({ value }) => createStudent.mutateAsync(value),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <PlusIcon /> Create Student
        </Button>
      </DialogTrigger>
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
            <form.Field name="password">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      Password
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      placeholder="Minimum 8 characters"
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
            <Field>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Student'}
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
