import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import type { LabTopology } from "@vlab/shared/schemas/lab";
import {
	type TopologyTemplateRequest,
	TopologyTemplateRequestSchema,
} from "@vlab/shared/schemas/topology-template";
import { Button } from "@web/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@web/components/ui/dialog";
import { useApiForm } from "@web/hooks/form/use-api-form";
import api from "@web/lib/api";
import { useTopologyStore } from "@web/shared/topology/stores";
import { SaveIcon } from "lucide-react";
import { useState } from "react";

const validator = Compile(TopologyTemplateRequestSchema);

export function SaveTopologyTemplateModal() {
	const [isOpen, setIsOpen] = useState(false);
	const store = useTopologyStore();
	const queryClient = useQueryClient();

	const form = useApiForm(api["topology-template"].post, {
		defaultValues: {
			name: "",
			topology: {} as LabTopology,
		} as unknown as TopologyTemplateRequest,
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				api["topology-template"].pagination.post.invalidateQuery(queryClient);
				setIsOpen(false);
				form.reset();
			},
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="bg-background/80 shadow-sm backdrop-blur-sm"
				>
					<SaveIcon className="mr-2 h-4 w-4" />
					Save as Template
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Save Topology Template</DialogTitle>
					<DialogDescription>
						Save your current topology as a template for future use.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();

						const { devices, edges, groups, notes, deviceCounts } =
							store.getState();
						form.setFieldValue("topology", {
							devices,
							edges,
							groups,
							notes,
							deviceCounts,
						} as LabTopology);

						form.handleSubmit();
					}}
				>
					<div className="grid gap-4 py-4">
						<form.AppField name="name">
							{(field) => (
								<field.TextField
									label="Template Name"
									placeholder="Enter template name..."
									required
								/>
							)}
						</form.AppField>
					</div>

					<div className="mt-4 flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsOpen(false)}
							disabled={form.state.isSubmitting}
						>
							Cancel
						</Button>
						<form.AppForm>
							<form.SubmitButton label="Save" />
						</form.AppForm>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
