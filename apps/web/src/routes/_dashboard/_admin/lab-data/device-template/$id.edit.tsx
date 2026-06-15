import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { UpdateDeviceTemplateRequest } from "@vlab/shared/schemas";
import { PageHeading } from "@web/components/sections/page-heading";
import { Button } from "@web/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import { useApiForm } from "@web/hooks/form/use-api-form";
import api from "@web/lib/api";
import { queryClient } from "@web/lib/query";
import { toast } from "sonner";
import TestConnectionButton from "./-module/components/buttons/test-connection-button";
import { DeviceBasicInfoForm } from "./-module/components/forms/device-basic-info-form";
import { DeviceConnectionForm } from "./-module/components/forms/device-connection-form";
import { DeviceEnvForm } from "./-module/components/forms/device-env-form";
import { DeviceNetworkInterfacesForm } from "./-module/components/forms/device-network-interfaces-form";
import { DeviceResourcesForm } from "./-module/components/forms/device-resources-form";
import { EnvFormStoreProvider } from "./-module/stores/env-form-store";
import { TestDeviceStoreProvider } from "./-module/stores/test-device-store";

const validator = Compile(UpdateDeviceTemplateRequest);

export const Route = createFileRoute(
	"/_dashboard/_admin/lab-data/device-template/$id/edit",
)({
	staticData: {
		breadcrumbs: [
			{ title: "Lab Data" },
			{ title: "Device Template", url: "/lab-data/device-template" },
			{ title: (data) => data.get("name") },
			{ title: "Edit" },
		],
	},
	loader: async ({ params: { id }, context }) => {
		const { name } = await api["device-template"]({ id }).get.ensureQueryData(
			queryClient,
		);
		context.breadcrumbData.set("name", name);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data: device } = api["device-template"]({
		id,
	}).get.useSuspenseQuery();

	const queryClient = useQueryClient();
	const form = useApiForm(api["device-template"]({ id }).put, {
		defaultValues: device,
		validators: { onSubmit: validator },
		onSubmitInvalid: () => {
			toast.error("Validation failed", {
				description: "Please check all required fields",
			});
		},
		mutation: {
			onSuccess: () => {
				api["device-template"].pagination.post.invalidateQuery(queryClient);
				api["device-template"].list.get.invalidateQuery(queryClient);
				api["device-template"]({ id }).get.invalidateQuery(queryClient);
				navigate({ to: "/lab-data/device-template", replace: true });
			},
		},
	});

	return (
		<TestDeviceStoreProvider>
			<EnvFormStoreProvider>
				<div className="space-y-6 pb-8">
					<PageHeading
						title="Update Template"
						subtitle="Edit device template"
						back={{
							to: "/lab-data/device-template",
						}}
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
								<CardContent>
									<DeviceBasicInfoForm
										form={form}
										fields={{
											name: "name",
											kind: "kind",
											image: "image",
											icon: "icon",
											deviceCategoryId: "deviceCategoryId",
										}}
									/>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="border-b">
									<CardTitle>Resources</CardTitle>
									<CardDescription>CPU and memory allocation</CardDescription>
								</CardHeader>
								<CardContent>
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
								<CardContent>
									<DeviceEnvForm form={form} fields={{ env: "env" }} />
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="flex justify-between border-b">
									<div>
										<CardTitle>Connection</CardTitle>
										<CardDescription>
											Remote access configuration
										</CardDescription>
									</div>
									<TestConnectionButton form={form as never} />
								</CardHeader>
								<CardContent>
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
								<CardContent>
									<DeviceNetworkInterfacesForm
										form={form}
										fields={{ interfaces: "interfaces" }}
									/>
								</CardContent>
							</Card>

							<div className="flex justify-end gap-4">
								<Button type="button" variant="outline" asChild>
									<Link to="/lab-data/device-template">Cancel</Link>
								</Button>
								<form.SubmitButton label="Update Device" />
							</div>
						</form.AppForm>
					</form>
				</div>
			</EnvFormStoreProvider>
		</TestDeviceStoreProvider>
	);
}
