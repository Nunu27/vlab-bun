import { Button } from '@frontend/components/ui/button';
import { ColorInput } from '@frontend/components/ui/color-input';
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
import { Compile } from '@sinclair/typemap';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { CreateDeviceCategoryRequest } from '@vlab/shared/schemas';
import { toast } from 'sonner';
import { useDeviceCategoryActionStore } from '../../stores/device-category-action-store';

const validator = Compile(CreateDeviceCategoryRequest);

export function CreateDeviceCategoryModal() {
  const store = useDeviceCategoryActionStore();
  const open = store.use.create();
  const { setCreate } = store.use.actions();

  const queryClient = useQueryClient();
  const createDeviceCategory = api['device-category'].post.useMutation({
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: ['device-category', 'pagination'],
      });
      setCreate(false);
      form.reset();
    },
  });

  const form = useForm({
    defaultValues: {
      name: '',
      color: '#000000',
    } as typeof CreateDeviceCategoryRequest.static,
    validators: { onSubmit: validator },
    onSubmit: ({ value }) => createDeviceCategory.mutateAsync(value),
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
              <div>
                <form.Field name="color">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;

                    return (
                      <Field>
                        <FieldLabel htmlFor={field.name} required>
                          Color
                        </FieldLabel>
                        <ColorInput
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(value) => field.handleChange(value)}
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
