import { CreateDeviceRequest } from '@backend/routes/device/schema';
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
import {
  getErrorMessageFromApi,
  getTitleFromBreadcrumbs,
} from '@frontend/lib/utils';
import { Compile } from '@sinclair/typemap';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { DeviceBasicInfoForm } from './-module/components/device-basic-info-form';
import { DeviceResourcesForm } from './-module/components/device-resources-form';
import { DeviceConnectionForm } from './-module/components/device-connection-form';
import { DeviceNetworkInterfacesForm } from './-module/components/device-network-interfaces-form';
import { DeviceEnvForm } from './-module/components/device-env-form';

const breadcrumbs = [
  { title: 'Lab Data' },
  { title: 'Device', url: '/lab/device' },
  { title: 'Create Device' },
];

export const Route = createFileRoute('/_dashboard/lab/device/create')({
  head: () => ({
    meta: [{ title: getTitleFromBreadcrumbs(breadcrumbs) }],
  }),
  beforeLoad: ({ context }) => {
    privateRoute(['admin'])({ context });

    context.breadcrumbs = breadcrumbs;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createDevice = useMutation({
    mutationFn: async (data: typeof CreateDeviceRequest.static) => {
      const result = await api.device.post(data);

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success('Device created successfully');
      queryClient.invalidateQueries({
        queryKey: ['device', 'pagination'],
        exact: false,
      });
      navigate({ to: '/lab/device' });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create device');
    },
  });

  const form = useForm({
    defaultValues: {
      name: null,
      kind: null,
      image: null,
      icon: null,
      categoryId: null,
      env: {},
      resources: {
        cpu: null,
        memory: null,
      },
      connection: {
        type: '',
        data: {
          port: null,
          username: null,
          password: null,
        },
      },
      interfaces: [],
    } as unknown as typeof CreateDeviceRequest.static,
    validators: { onSubmit: Compile(CreateDeviceRequest) },
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
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Basic device identification and configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DeviceBasicInfoForm form={form} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
            <CardDescription>CPU and memory allocation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DeviceResourcesForm form={form} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>
              Define environment variables for the device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DeviceEnvForm form={form} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
            <CardDescription>Remote access configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DeviceConnectionForm form={form} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Network Interfaces</CardTitle>
            <CardDescription>
              Define network interfaces for the device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DeviceNetworkInterfacesForm form={form} />
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-end">
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
      </form>
    </div>
  );
}
