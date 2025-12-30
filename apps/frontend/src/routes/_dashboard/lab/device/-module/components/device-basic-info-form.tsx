import { IconPicker } from '@frontend/components/ui/icon-picker';
import { ComboBox, PaginatedComboBox } from '@frontend/components/ui/combobox';
import { Field, FieldError, FieldLabel } from '@frontend/components/ui/field';
import { Input } from '@frontend/components/ui/input';
import api from '@frontend/lib/api';
import { deviceKindEnum } from '@vlab/shared/enums';
import { withForm, type DeviceFormData } from '../hooks/use-device-form';

export const DeviceBasicInfoForm = withForm({
  defaultValues: {} as DeviceFormData,
  props: {
    defaultCategory: undefined as { id: string; name: string } | undefined,
  },
  render: function Render({ form, defaultCategory }) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
        <div className="md:row-span-2">
          <form.Field name="icon">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field>
                  <FieldLabel htmlFor={field.name} required>
                    Device Icon
                  </FieldLabel>
                  <IconPicker
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value)}
                    placeholder="Select icon..."
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      Device Name
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="e.g., Cisco Router 1"
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

            <form.Field name="image">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      Docker Image
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="e.g., cisco/ios:latest"
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <form.Field name="kind">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      Device Kind
                    </FieldLabel>
                    <ComboBox
                      options={deviceKindEnum.map((kind) => ({
                        value: kind,
                        label: kind,
                      }))}
                      value={field.state.value}
                      onChange={(value) =>
                        field.handleChange(
                          (value ?? '') as typeof field.state.value,
                        )
                      }
                      placeholder="Select device kind"
                      searchPlaceholder="Search device kinds..."
                      emptyMessage="No device kind found."
                      width="w-full"
                      allowClear
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="categoryId">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      Category
                    </FieldLabel>
                    <PaginatedComboBox
                      queryKey={['device-category', 'pagination']}
                      fetcher={({ page, search }) =>
                        api['device-category'].pagination.post({
                          page,
                          perPage: 20,
                          search: search || undefined,
                        })
                      }
                      renderOption={(item) => ({
                        value: item.id,
                        label: item.name,
                      })}
                      defaultOptions={
                        defaultCategory
                          ? [
                              {
                                value: defaultCategory.id,
                                label: defaultCategory.name,
                              },
                            ]
                          : []
                      }
                      value={field.state.value}
                      onChange={(value) => field.handleChange(value ?? '')}
                      placeholder="Select category"
                      searchPlaceholder="Search categories..."
                      emptyMessage="No category found."
                      width="w-full"
                      allowClear
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
      </div>
    );
  },
});
