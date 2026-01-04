import { CreateLecturerRequest } from '@vlab/shared/schemas';
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
import api from '@frontend/lib/api';
import { Compile } from '@sinclair/typemap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessageFromApi } from '@frontend/helper/error';

const validator = Compile(CreateLecturerRequest);

export function CreateLecturerModal() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createLecturer = useMutation({
    mutationFn: async (data: typeof CreateLecturerRequest.static) => {
      const result = await api.user.lecturer.post(data);

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['lecturer', 'pagination'] });
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
      email: '',
      nip: '',
      password: '',
    },
    validators: { onSubmit: validator },
    onSubmit: ({ value }) => createLecturer.mutateAsync(value),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <PlusIcon /> Create Lecturer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Lecturer</DialogTitle>
          <DialogDescription>
            Create a new lecturer account with login credentials.
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
            <form.Field name="nip">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      NIP
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="123456789"
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
                    {isSubmitting ? 'Creating...' : 'Create Lecturer'}
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
