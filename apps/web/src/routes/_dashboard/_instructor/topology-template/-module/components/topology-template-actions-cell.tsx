import { Link } from "@tanstack/react-router";
import { ActionButton } from "@web/components/buttons/action-button";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useTopologyTemplateModalStore } from "../stores/topology-template-modal-store";
import type { TopologyTemplateItem } from "../types";

export function TopologyTemplateActionsCell({
	template,
}: {
	template: TopologyTemplateItem;
}) {
	const actions = useTopologyTemplateModalStore().use.actions();

	return (
		<div className="flex gap-2">
			<ActionButton icon={PencilIcon} tooltip="Edit" asChild>
				<Link
					to="/topology-template/$templateId"
					params={{ templateId: template.id }}
				>
					<PencilIcon className="size-4" />
					<span className="sr-only">Edit</span>
				</Link>
			</ActionButton>
			<ActionButton
				icon={Trash2Icon}
				tooltip="Delete"
				variant="destructive"
				onClick={() => actions.delete.open(template)}
			/>
		</div>
	);
}
