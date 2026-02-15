import { Link } from "@tanstack/react-router";
import { ActionButton } from "@web/components/buttons/action-button";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useLabModalStore } from "../stores/lab-modal-store";
import type { LabItem } from "../types";

export function LabActionsCell({ lab }: { lab: LabItem }) {
	const actions = useLabModalStore().use.actions();

	return (
		<div className="flex gap-2">
			<ActionButton icon={PencilIcon} tooltip="Edit" asChild>
				<Link to="/my-lab/$labId/edit" params={{ labId: lab.id }}>
					<PencilIcon className="size-4" />
					<span className="sr-only">Edit</span>
				</Link>
			</ActionButton>
			<ActionButton
				icon={Trash2Icon}
				tooltip="Delete"
				variant="destructive"
				onClick={() => actions.delete.open(lab)}
			/>
		</div>
	);
}
