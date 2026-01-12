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
import { useActionState } from '@frontend/hooks/use-action-state';
import api from '@frontend/lib/api';
import { Compile } from '@sinclair/typemap';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { UpdateDepartmentRequest } from '@vlab/shared/schemas';
import { toast } from 'sonner';
import { useDepartmentActionStore } from '../../stores/department-action-store';

const validator = Compile(UpdateDepartmentRequest);

export function EditDepartmentModal() {
  const queryClient = useQueryClient();
  const { setUpdate } = useDepartmentActionStore().use.actions();
  const { open, data } = useActionState(
    useDepartmentActionStore().use.update(),
  );

  const updateDepartment = api
    .department({ id: data?.id ?? '' })
    .put.useMutation({
      onSuccess: ({ message }) => {
        toast.success(message);
        queryClient.invalidateQueries({
          queryKey: ['department', 'pagination'],
        });
        setUpdate(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const form = useForm({
    defaultValues: { name: data?.name ?? '' },
    validators: { onSubmit: validator },
    onSubmit: ({ value }) => updateDepartment.mutateAsync(value),
  });

  return (
    <Dialog open={open} onOpenChange={() => setUpdate(null)}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>Update department information.</DialogDescription>
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
                      Department Name
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="e.g., Computer Science"
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
                    {isSubmitting ? 'Updating...' : 'Update Department'}
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
