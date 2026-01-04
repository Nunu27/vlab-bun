import { PageHeading } from '@frontend/components/page-heading';
import { Button } from '@frontend/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@frontend/components/ui/card';
import api from '@frontend/lib/api';
import { privateRoute } from '@frontend/lib/middlewares';
import { Compile } from '@sinclair/typemap';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CreateDeviceRequest } from '@vlab/shared/schemas';
import { toast } from 'sonner';
import TestConnectionButton from './-module/components/buttons/test-connection-button';
import { DeviceBasicInfoForm } from './-module/components/device-basic-info-form';
import { DeviceConnectionForm } from './-module/components/device-connection-form';
import { DeviceEnvForm } from './-module/components/device-env-form';
import { DeviceNetworkInterfacesForm } from './-module/components/device-network-interfaces-form';
import { DeviceResourcesForm } from './-module/components/device-resources-form';
import {
  type DeviceFormData,
  useAppForm,
} from './-module/hooks/use-device-form';
import { TestDeviceStoreProvider } from './-module/stores/test-device';

const breadcrumbs = [
  { title: 'Lab Data' },
  { title: 'Device', url: '/lab/device' },
  { title: 'Create Device' },
];
const validator = Compile(CreateDeviceRequest);

export const Route = createFileRoute('/_dashboard/lab/device/create')({
  staticData: { breadcrumbs },
  beforeLoad: privateRoute(['admin']),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createDevice = api.device.post.useMutation({
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: ['device'],
      });
      navigate({ to: '/lab/device' });
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: '',
      kind: null,
      image: '',
      icon: null,
      categoryId: null,
      env: {},
      resources: {},
      connection: {},
      interfaces: [],
    } as unknown as DeviceFormData,
    validators: { onSubmit: validator },
    onSubmit: ({ value }) => createDevice.mutateAsync(value),
    onSubmitInvalid: () => {
      toast.error('Validation failed', {
        description: 'Please check all required fields',
      });
    },
  });

  return (
    <div className="space-y-6 pb-8">
      <PageHeading
        title="Create Device"
        subtitle="Add a new device configuration"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <form.AppForm>
          {/* Basic Information */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Basic device identification and configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <DeviceBasicInfoForm form={form} defaultCategory={undefined} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Resources</CardTitle>
              <CardDescription>CPU and memory allocation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <DeviceResourcesForm form={form} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>
                Define environment variables for the device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <DeviceEnvForm form={form} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between border-b">
              <div>
                <CardTitle>Connection</CardTitle>
                <CardDescription>Remote access configuration</CardDescription>
              </div>
              <TestDeviceStoreProvider>
                <TestConnectionButton form={form} />
              </TestDeviceStoreProvider>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <DeviceConnectionForm form={form} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Network Interfaces</CardTitle>
              <CardDescription>
                Define network interfaces for the device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <DeviceNetworkInterfacesForm form={form} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/lab/device' })}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Device'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form.AppForm>
      </form>
    </div>
  );
}
