import { Button } from "@web/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useStudentModalStore } from "../../stores/student-modal-store";

export default function CreateStudentButton() {
	const actions = useStudentModalStore().use.actions();

	return (
		<Button onClick={actions.create.open}>
			<PlusIcon className="mr-2 h-4 w-4" />
			Create Student
		</Button>
	);
}
