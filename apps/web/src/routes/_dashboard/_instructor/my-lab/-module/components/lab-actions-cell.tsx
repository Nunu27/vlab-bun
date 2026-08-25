import type { LabItem } from "../types";
import DeleteLabButton from "./buttons/delete-lab-button";
import DuplicateLabButton from "./buttons/duplicate-lab-button";
import EditLabButton from "./buttons/edit-lab-button";

export function LabActionsCell({ lab }: { lab: LabItem }) {
	return (
		<div className="flex gap-2">
			<EditLabButton labId={lab.id} />
			<DuplicateLabButton lab={lab} />
			<DeleteLabButton lab={lab} />
		</div>
	);
}
