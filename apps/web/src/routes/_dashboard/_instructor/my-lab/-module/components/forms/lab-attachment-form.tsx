import { ActionButton } from "@web/components/buttons/action-button";
import { Button } from "@web/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@web/components/ui/empty";
import { InputGroup, InputGroupAddon } from "@web/components/ui/input-group";
import { withFieldGroup } from "@web/hooks/form/use-app-form";
import api from "@web/lib/api";
import {
	ExternalLinkIcon,
	Loader2Icon,
	PaperclipIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import { useRef, useState } from "react";

function AttachmentUploader({
	pushValue,
}: {
	pushValue: (val: { name: string; file: string }) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isUploading, setIsUploading] = useState(false);

	const mutation = api.file.upload.post.useMutation({
		showSuccessMessage: false,
	});

	const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (!files.length) return;

		setIsUploading(true);

		try {
			await Promise.all(
				files.map(async (file) => {
					const res = await mutation.mutateAsync({ file });

					// Separate the basename and extension
					const nameSplit = file.name.split(".");
					if (nameSplit.length > 1) nameSplit.pop();
					const baseName = nameSplit.join(".");

					pushValue({ name: baseName, file: res.name });
				}),
			);
		} finally {
			setIsUploading(false);
		}

		e.target.value = "";
	};

	return (
		<>
			<input
				type="file"
				multiple
				className="hidden"
				ref={inputRef}
				onChange={handleUpload}
			/>
			<Button
				type="button"
				variant="outline"
				onClick={() => inputRef.current?.click()}
				disabled={isUploading}
			>
				{isUploading ? (
					<Loader2Icon className="mr-1 size-3 animate-spin" />
				) : (
					<PlusIcon className="mr-1 size-3" />
				)}
				{isUploading ? "Uploading..." : "Add Attachments"}
			</Button>
		</>
	);
}

export const LabAttachmentForm = withFieldGroup({
	defaultValues: {
		attachments: [] as { name: string; file: string }[],
	},
	render: ({ group }) => {
		return (
			<group.AppField name="attachments" mode="array">
				{(attachmentsField) => {
					const attachments = attachmentsField.state.value || [];

					return (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="font-medium text-sm">Attachments</span>
								<AttachmentUploader pushValue={attachmentsField.pushValue} />
							</div>

							{attachments.length > 0 ? (
								<div className="space-y-2">
									{attachments.map((_, idx) => {
										const item = attachments[idx];
										const extMatch = item?.file?.match(/\.[0-9a-z]+$/i);
										const extension = extMatch ? extMatch[0] : "";

										return (
											<div
												key={idx.toString()}
												className="flex items-end gap-2"
											>
												<div className="flex flex-1 items-end">
													<group.AppField name={`attachments[${idx}].name`}>
														{(field) => (
															<InputGroup>
																<field.TextField
																	placeholder="e.g., Lab Guide"
																	className="rounded-e-none"
																/>
																<InputGroupAddon
																	align="inline-end"
																	className="px-2"
																>
																	{extension}
																</InputGroupAddon>
															</InputGroup>
														)}
													</group.AppField>
												</div>
												<Button
													type="button"
													size="icon"
													variant="outline"
													asChild
												>
													<a
														href={`/api/file/${item.file}`}
														target="_blank"
														rel="noreferrer"
														title="View Document"
													>
														<ExternalLinkIcon />
													</a>
												</Button>
												<ActionButton
													tooltip="Delete"
													icon={Trash2Icon}
													variant="destructive"
													onClick={() => attachmentsField.removeValue(idx)}
												/>
											</div>
										);
									})}
								</div>
							) : (
								<Empty className="border border-dashed">
									<EmptyContent>
										<EmptyMedia variant="icon">
											<PaperclipIcon />
										</EmptyMedia>
										<EmptyTitle>No Attachments</EmptyTitle>
										<EmptyDescription>
											No attachments added yet.
										</EmptyDescription>
									</EmptyContent>
								</Empty>
							)}
						</div>
					);
				}}
			</group.AppField>
		);
	},
});
