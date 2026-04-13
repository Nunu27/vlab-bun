import { Link } from "@tanstack/react-router";
import { ActionButton } from "@web/components/buttons/action-button";
import { PencilIcon } from "lucide-react";

function EditLabButton({ labId }: { labId: string }) {
	return (
		<ActionButton icon={PencilIcon} tooltip="Edit" asChild>
			<Link to="/my-lab/$labId/edit" params={{ labId }}>
				<PencilIcon className="size-4" />
				<span className="sr-only">Edit</span>
			</Link>
		</ActionButton>
	);
}

export default EditLabButton;
