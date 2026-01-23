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
import { UpdateDeviceCategoryRequest } from '@vlab/shared/schemas/rest';
import { useEffect } from 'react';
import { useDeviceCategoryActionStore } from '../../stores/device-category-action-store';

const validator = Compile(UpdateDeviceCategoryRequest);

export function EditDeviceCategoryModal() {
  const store = useDeviceCategoryActionStore();
  const { open, data } = useActionState(store.use.update());
  const { setUpdate } = store.use.actions();

  const queryClient = useQueryClient();
  const request = api['device-category']({ id: data?.id ?? '' });
  const form = request.put.useForm({
    defaultValues: {
      name: data?.name ?? '',
      color: data?.color ?? '',
    },
    validators: { onSubmit: validator },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['device-category', 'pagination'],
        });
        setUpdate(null);
      },
    },
  });

  useEffect(() => {
    if (!data) form.reset();
  }, [data, form]);

  return (
    <Dialog open={open} onOpenChange={() => setUpdate(null)}>
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
            <div className="flex flex-col items-start gap-4 md:flex-row">
              <div className="flex-1">
                <form.AppField name="name">
                  {(field) => (
                    <field.TextField
                      label="Category Name"
                      placeholder="e.g., Routers"
                      required
                    />
                  )}
                </form.AppField>
              </div>
              <div>
                <form.AppField name="color">
                  {(field) => <field.ColorField label="Color" required />}
                </form.AppField>
              </div>
            </div>
            <form.AppForm>
              <form.SubmitButton label="Update Category" />
            </form.AppForm>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
