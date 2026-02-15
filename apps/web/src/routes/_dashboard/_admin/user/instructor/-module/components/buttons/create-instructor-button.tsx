import { Button } from "@web/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useInstructorModalStore } from "../../stores/instructor-modal-store";

export function CreateInstructorButton() {
	const actions = useInstructorModalStore().use.actions();

	return (
		<Button onClick={actions.create.open}>
			<PlusIcon className="mr-2 h-4 w-4" />
			Create Instructor
		</Button>
	);
}
