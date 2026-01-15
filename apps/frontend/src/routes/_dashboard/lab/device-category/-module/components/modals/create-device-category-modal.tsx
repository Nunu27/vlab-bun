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
import { CreateDeviceCategoryRequest } from '@vlab/shared/schemas';
import { useDeviceCategoryActionStore } from '../../stores/device-category-action-store';

const validator = Compile(CreateDeviceCategoryRequest);

export function CreateDeviceCategoryModal() {
  const store = useDeviceCategoryActionStore();
  const open = store.use.create();
  const { setCreate } = store.use.actions();

  const queryClient = useQueryClient();
  const form = api['device-category'].post.useForm({
    defaultValues: {
      name: '',
      color: '#000000',
    } as typeof CreateDeviceCategoryRequest.static,
    validators: { onSubmit: validator },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['device-category', 'pagination'],
        });
        setCreate(false);
        form.reset();
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={() => setCreate(false)}>
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
              <form.AppField name="color">
                {(field) => <field.ColorField label="Color" required />}
              </form.AppField>
            </div>
            <form.AppForm>
              <form.SubmitButton label="Create Category" />
            </form.AppForm>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
