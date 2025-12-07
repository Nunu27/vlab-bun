import { UpdateLecturerRequest } from '@vlab/shared/schemas';
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
import api from '@frontend/lib/api';
import { getErrorMessageFromApi } from '@frontend/lib/utils';
import { Compile } from '@sinclair/typemap';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EditLecturerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lecturerId: string;
  lecturerName: string;
  lecturerEmail: string;
  lecturerNip: string;
}

export function EditLecturerModal({
  open,
  onOpenChange,
  lecturerId,
  lecturerName,
  lecturerEmail,
  lecturerNip,
}: EditLecturerModalProps) {
  const queryClient = useQueryClient();

  const updateLecturer = useMutation({
    mutationFn: async (data: typeof UpdateLecturerRequest.static) => {
      const result = await api.user.lecturer({ id: lecturerId }).put(data);

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: ['lecturer', 'pagination'],
        exact: false,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      name: lecturerName,
      email: lecturerEmail,
      nip: lecturerNip,
    },
    validators: {
      onSubmit: Compile(UpdateLecturerRequest),
    },
    onSubmit: ({ value }) => updateLecturer.mutateAsync(value),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Lecturer</DialogTitle>
          <DialogDescription>Update lecturer information.</DialogDescription>
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
            <Field>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? 'Updating...' : 'Update Lecturer'}
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
