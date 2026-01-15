import { withFieldGroup } from '@frontend/hooks/use-app-form';
import api from '@frontend/lib/api';
import { deviceKindEnum, type DeviceKind } from '@vlab/shared/enums';

export const DeviceBasicInfoForm = withFieldGroup({
  defaultValues: {
    name: '',
    kind: 'linux' as DeviceKind,
    image: '',
    icon: '',
    categoryId: '',
  },
  props: {
    defaultCategory: undefined as { id: string; name: string } | undefined,
  },
  render: function Render({ group, defaultCategory }) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
        <div className="md:row-span-2">
          <group.AppField name="icon">
            {(field) => (
              <field.IconField
                label="Device Icon"
                placeholder="Select icon..."
                required
              />
            )}
          </group.AppField>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <group.AppField name="name">
              {(field) => (
                <field.TextField
                  label="Device Name"
                  placeholder="e.g., Cisco Router 1"
                  required
                />
              )}
            </group.AppField>

            <group.AppField name="image">
              {(field) => (
                <field.TextField
                  label="Docker Image"
                  placeholder="e.g., cisco/ios:latest"
                  required
                />
              )}
            </group.AppField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <group.AppField name="kind">
              {(field) => (
                <field.ComboBoxField
                  label="Device Kind"
                  required
                  options={deviceKindEnum.map((kind) => ({
                    value: kind,
                    label: kind,
                  }))}
                  placeholder="Select device kind"
                  searchPlaceholder="Search device kinds..."
                  emptyMessage="No device kind found."
                  allowClear
                />
              )}
            </group.AppField>

            <group.AppField name="categoryId">
              {(field) => (
                <field.PaginatedComboBoxField
                  label="Category"
                  required
                  placeholder="Select category"
                  searchPlaceholder="Search categories..."
                  emptyMessage="No category found."
                  allowClear
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
                  endpoint={api['device-category'].pagination.get}
                  params={{ perPage: 20 }}
                  renderOption={(item) => ({
                    value: item.id,
                    label: item.name,
                  })}
                />
              )}
            </group.AppField>
          </div>
        </div>
      </div>
    );
  },
});
