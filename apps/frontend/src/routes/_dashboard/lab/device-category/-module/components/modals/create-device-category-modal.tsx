import { CreateDeviceCategoryRequest } from '@vlab/shared/schemas';
import ImageInput from '@frontend/components/input/image-input';
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
import type { FileMetadata } from '@frontend/hooks/use-file-upload';
import api from '@frontend/lib/api';
import { getErrorMessageFromApi } from '@frontend/lib/utils';
import { Compile } from '@sinclair/typemap';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function CreateDeviceCategoryModal() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createDeviceCategory = useMutation({
    mutationFn: async (data: typeof CreateDeviceCategoryRequest.static) => {
      const result = await api['device-category'].post(data);

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: ['device-category', 'pagination'],
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
      icon: undefined,
    } as unknown as typeof CreateDeviceCategoryRequest.static,
    validators: { onSubmit: Compile(CreateDeviceCategoryRequest) },
    onSubmit: ({ value }) => createDeviceCategory.mutateAsync(value),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <PlusIcon /> Add Device Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Device Category</DialogTitle>
          <DialogDescription>Create a new device category.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <div className="flex flex-col items-start gap-4 md:flex-row">
              <div className="w-full shrink-0 md:w-48">
                <form.Field name="icon">
                  {(field) => {
                    return (
                      <Field>
                        <FieldLabel required>Icon</FieldLabel>
                        <ImageInput
                          errors={field.state.meta.errors}
                          onImageChange={(file: File | FileMetadata | null) =>
                            form.setFieldValue('icon', file as File)
                          }
                        />
                      </Field>
                    );
                  }}
                </form.Field>
              </div>
              <div className="flex-1">
                <form.Field name="name">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;

                    return (
                      <Field>
                        <FieldLabel htmlFor={field.name} required>
                          Category Name
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          placeholder="e.g., Routers"
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
              </div>
            </div>
            <Field>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Category'}
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
