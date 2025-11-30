import { UpdateDeviceCategoryRequest } from '@backend/routes/device-category/schema';
import ImageInput from '@frontend/components/input/image-input';
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
import { useEffect } from 'react';
import { toast } from 'sonner';

interface EditDeviceCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceCategoryId: string;
  deviceCategoryName: string;
  deviceCategoryIcon: string;
}

export function EditDeviceCategoryModal({
  open,
  onOpenChange,
  deviceCategoryId,
  deviceCategoryName,
  deviceCategoryIcon,
}: EditDeviceCategoryModalProps) {
  const queryClient = useQueryClient();

  const updateDeviceCategory = useMutation({
    mutationFn: async (data: typeof UpdateDeviceCategoryRequest.static) => {
      const result = await api['device-category']({ id: deviceCategoryId }).put(
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
        queryKey: ['device-category', 'pagination'],
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
      name: deviceCategoryName,
      icon: undefined,
    } as typeof UpdateDeviceCategoryRequest.static,
    validators: { onSubmit: Compile(UpdateDeviceCategoryRequest) },
    onSubmit: ({ value }) => updateDeviceCategory.mutateAsync(value),
  });

  useEffect(() => {
    form.reset({ name: deviceCategoryName, icon: undefined });
  }, [deviceCategoryName, deviceCategoryIcon, form]);

  const initialFile = deviceCategoryIcon
    ? {
        id: deviceCategoryIcon,
        name: deviceCategoryIcon,
        size: 0,
        type: 'image/*',
        url: `/api/file/${deviceCategoryIcon}`,
      }
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Device Category</DialogTitle>
          <DialogDescription>
            Update device category information.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="w-full md:w-48 shrink-0">
                <form.Field name="icon">
                  {(field) => {
                    return (
                      <Field>
                        <FieldLabel>Icon</FieldLabel>
                        <ImageInput
                          initialFile={initialFile}
                          errors={field.state.meta.errors}
                          onImageChange={(file) =>
                            field.handleChange(
                              (file instanceof File ? file : undefined) as
                                | File
                                | undefined,
                            )
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
                    {isSubmitting ? 'Updating...' : 'Update Category'}
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
