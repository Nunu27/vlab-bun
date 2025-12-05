import { UpdateDeviceRequest } from '@backend/routes/device/schema';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { DeviceBasicInfoForm } from './-module/components/device-basic-info-form';
import { DeviceConnectionForm } from './-module/components/device-connection-form';
import { DeviceEnvForm } from './-module/components/device-env-form';
import { DeviceNetworkInterfacesForm } from './-module/components/device-network-interfaces-form';
import { DeviceResourcesForm } from './-module/components/device-resources-form';
import { useAppForm } from './-module/hooks/use-device-form';

const breadcrumbs = [
  { title: 'Lab Data' },
  { title: 'Device', url: '/lab/device' },
  { title: 'Update Device' },
];

export const Route = createFileRoute('/_dashboard/lab/device/$id/update')({
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
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: deviceData, isLoading: isLoadingDevice } = useQuery({
    queryKey: ['device', id],
    queryFn: async () => {
      const result = await api.device({ id }).get();

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data.data;
    },
  });

  const updateDevice = useMutation({
    mutationFn: async (data: typeof UpdateDeviceRequest.static) => {
      const result = await api.device({ id }).put(data);

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: ['device'],
        exact: false,
      });
      navigate({ to: '/lab/device' });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: deviceData?.name ?? '',
      kind: deviceData?.kind ?? 'linux',
      image: deviceData?.image ?? '',
      icon: undefined,
      categoryId: deviceData?.categoryId ?? '',
      env: deviceData?.env ?? {},
      resources: deviceData?.resources ?? {
        cpu: 1,
        memory: '512M',
      },
      connection: deviceData?.connection ?? {
        type: 'ssh',
        data: {
          port: 22,
          username: '',
          password: '',
        },
      },
      interfaces: deviceData?.interfaces ?? [],
    } as typeof UpdateDeviceRequest.static,
    validators: { onSubmit: Compile(UpdateDeviceRequest) },
    onSubmit: ({ value }) => updateDevice.mutateAsync(value),
    onSubmitInvalid: () => {
      toast.error('Validation failed', {
        description: 'Please check all required fields',
      });
    },
  });

  if (isLoadingDevice) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-muted-foreground">Loading device data...</div>
      </div>
    );
  }

  if (!deviceData) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-destructive">Device not found</div>
      </div>
    );
  }

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
                placeholder={`/api/file/${deviceData.icon}`}
              />
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
            <CardHeader className="border-b">
              <CardTitle>Connection</CardTitle>
              <CardDescription>Remote access configuration</CardDescription>
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
                  {isSubmitting ? 'Updating...' : 'Update Device'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form.AppForm>
      </form>
    </div>
  );
}
