import { FieldGroup } from "@web/components/ui/field";
import { useAppForm } from "@web/hooks/form/use-app-form";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

const EMPTY_RESOURCES = {};
const EMPTY_CREDENTIALS = {};

function DeviceProperties({ id }: { id: string }) {
	const store = useTopologyStore();
	const { updateDevice } = store.use.actions();
	const device = store.use.devices(
		useShallow((devices) => {
			const found = devices[id];
			if (!found)
				return {
					name: "",
					resources: EMPTY_RESOURCES,
					credentials: EMPTY_CREDENTIALS,
					deviceId: "",
				};
			const { name, resources, credentials, deviceId } = found;
			return {
				name,
				resources: resources ?? EMPTY_RESOURCES,
				credentials: credentials ?? EMPTY_CREDENTIALS,
				deviceId,
			};
		}),
	);

	const template = store.use.templates((templates) =>
		device.deviceId ? templates.get(device.deviceId) : undefined,
	);

	const form = useAppForm({
		defaultValues: device,
		onSubmit: ({ value }) => updateDevice(id, value),
	});

	useEffect(() => {
		form.reset(device);
	}, [device, form.reset]);

	return (
		<FieldGroup
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					form.handleSubmit();
				}
			}}
		>
			<form.AppField
				name="name"
				validators={{
					onChange: ({ value }) =>
						value.trim()
							? undefined
							: { message: "Name must be non-empty string" },
					onBlur: ({ value }) => {
						const { deviceNames } = store.getState();

						if (value === device.name || !deviceNames.has(value)) return;
						return { message: "Name must be unique" };
					},
				}}
			>
				{(field) => (
					<field.TextField label="Name" placeholder="Device Name" required />
				)}
			</form.AppField>
			<div className="grid grid-cols-2 gap-4">
				<form.AppField name="resources.cpu">
					{(field) => (
						<field.NumberField
							label="CPU Cores"
							min="0.1"
							placeholder={template?.resources.cpu?.toString() || undefined}
						/>
					)}
				</form.AppField>

				<form.AppField name="resources.memory">
					{(field) => (
						<field.TextField
							label="Memory"
							placeholder={template?.resources.memory || "e.g., 512M, 1G"}
						/>
					)}
				</form.AppField>
			</div>

			<div className="space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<form.AppField name="credentials.username">
						{(field) => (
							<field.TextField
								label="Username"
								placeholder={
									template?.connection.data.username ||
									"Leave empty for default"
								}
							/>
						)}
					</form.AppField>
					<form.AppField name="credentials.password">
						{(field) => (
							<field.TextField
								type="password"
								label="Password"
								placeholder={
									template?.connection.data.password ||
									"Leave empty for default"
								}
							/>
						)}
					</form.AppField>
				</div>
			</div>

			<form.AppForm>
				<form.SubmitButton
					type="button"
					label="Save"
					onClick={form.handleSubmit}
				/>
			</form.AppForm>
		</FieldGroup>
	);
}

export default DeviceProperties;
