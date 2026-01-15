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
import { queryClient } from '@frontend/lib/query';
import { Compile } from '@sinclair/typemap';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { UpdateDeviceRequest } from '@vlab/shared/schemas';
import { toast } from 'sonner';
import TestConnectionButton from './-module/components/buttons/test-connection-button';
import { DeviceBasicInfoForm } from './-module/components/forms/device-basic-info-form';
import { DeviceConnectionForm } from './-module/components/forms/device-connection-form';
import { DeviceEnvForm } from './-module/components/forms/device-env-form';
import { DeviceNetworkInterfacesForm } from './-module/components/forms/device-network-interfaces-form';
import { DeviceResourcesForm } from './-module/components/forms/device-resources-form';
import { TestDeviceStoreProvider } from './-module/stores/test-device';

const validator = Compile(UpdateDeviceRequest);

export const Route = createFileRoute('/_dashboard/lab/device/$id/update')({
  staticData: {
    breadcrumbs: [
      { title: 'Lab Data' },
      { title: 'Device', url: '/lab/device' },
      { title: 'Update Device' },
    ],
  },
  beforeLoad: privateRoute(['admin']),
  loader: async ({ params: { id } }) => {
    await api.device({ id }).get.ensureQueryData(queryClient);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: device } = api.device({ id }).get.useSuspenseQuery();

  const queryClient = useQueryClient();
  const form = api.device({ id }).put.useForm({
    defaultValues: {
      ...device,
      categoryId: device.category.id,
    },
    validators: { onSubmit: validator },
    onSubmitInvalid: () => {
      toast.error('Validation failed', {
        description: 'Please check all required fields',
      });
    },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['device', 'pagination'] });
        queryClient.invalidateQueries({ queryKey: ['device', 'list'] });
        queryClient.invalidateQueries({ queryKey: ['device', { id }] });
        navigate({ to: '/lab/device' });
      },
    },
  });

  return (
    <div className="space-y-6 pb-8">
      <PageHeading title="Update Device" subtitle="Edit device configuration" />
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
              <DeviceBasicInfoForm
                form={form}
                defaultCategory={device.category}
                fields={{
                  name: 'name',
                  kind: 'kind',
                  image: 'image',
                  icon: 'icon',
                  categoryId: 'categoryId',
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Resources</CardTitle>
              <CardDescription>CPU and memory allocation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <DeviceResourcesForm form={form} fields="resources" />
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
              <DeviceEnvForm form={form} fields="env" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between border-b">
              <div>
                <CardTitle>Connection</CardTitle>
                <CardDescription>Remote access configuration</CardDescription>
              </div>
              <TestDeviceStoreProvider>
                <TestConnectionButton
                  form={form}
                  fields={{
                    name: 'name',
                    kind: 'kind',
                    image: 'image',
                    env: 'env',
                    resources: 'resources',
                    connection: 'connection',
                    interfaces: 'interfaces',
                  }}
                />
              </TestDeviceStoreProvider>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <DeviceConnectionForm form={form} fields="connection" />
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
              <DeviceNetworkInterfacesForm form={form} fields="interfaces" />
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
            <form.SubmitButton label="Update Device" />
          </div>
        </form.AppForm>
      </form>
    </div>
  );
}
