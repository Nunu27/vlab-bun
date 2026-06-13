import type { LabRequest } from "@vlab/shared/schemas";
import { withFieldGroup } from "@web/hooks/form/use-app-form";
import { LabAttachmentForm } from "./lab-attachment-form";

export const LabBasicInfoForm = withFieldGroup({
	defaultValues: {} as Pick<
		LabRequest,
		| "cover"
		| "name"
		| "content"
		| "isPublished"
		| "date"
		| "sessionDuration"
		| "maxAttempt"
		| "attachments"
	>,
	render: ({ group }) => {
		return (
			<div className="space-y-4">
				{/* Top: cover left, core fields right */}
				<div className="flex flex-col gap-4 sm:flex-row">
					<div className="w-full sm:w-56 sm:shrink-0">
						<group.AppField name="cover">
							{(field) => <field.ImageField label="Cover Image" />}
						</group.AppField>
					</div>

					<div className="flex flex-1 flex-col gap-3">
						<group.AppField name="name">
							{(field) => (
								<field.TextField
									label="Lab Name"
									placeholder="e.g., My Lab"
									required
								/>
							)}
						</group.AppField>

						<div className="grid grid-cols-[2fr_1fr_1fr] items-end gap-4">
							<group.AppField name="date">
								{(field) => (
									<field.DateRangeField label="Date Range" required />
								)}
							</group.AppField>

							<group.AppField name="sessionDuration">
								{(field) => (
									<field.NumberField
										label="Duration (min)"
										placeholder="e.g., 180"
										min={1}
										required
									/>
								)}
							</group.AppField>

							<group.AppField name="maxAttempt">
								{(field) => (
									<field.NumberField
										label="Max Attempt"
										placeholder="e.g., 3"
										min={1}
									/>
								)}
							</group.AppField>
						</div>
					</div>
				</div>

				{/* Description / Content */}
				<group.AppField name="content">
					{(field) => <field.MarkdownField label="Content Description" />}
				</group.AppField>

				{/* Attachments */}
				<LabAttachmentForm
					form={group}
					fields={{ attachments: "attachments" }}
				/>

				<group.AppField name="isPublished">
					{(field) => (
						<field.SwitchField
							label="Published"
							description="Make this lab visible to students"
						/>
					)}
				</group.AppField>
			</div>
		);
	},
});
