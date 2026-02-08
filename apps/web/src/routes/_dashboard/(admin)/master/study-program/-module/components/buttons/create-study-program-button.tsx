import { Button } from "@web/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useStudyProgramModalStore } from "../../stores/study-program-modal-store";

function CreateStudyProgramButton() {
	const actions = useStudyProgramModalStore().use.actions();

	return (
		<Button size="lg" onClick={() => actions.create.open()}>
			<PlusIcon /> Add Study Program
		</Button>
	);
}

export default CreateStudyProgramButton;
