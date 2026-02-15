import { Button } from "@web/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useDepartmentModalStore } from "../../stores/department-modal-store";

function CreateDepartmentButton() {
	const actions = useDepartmentModalStore().use.actions();

	return (
		<Button size="lg" onClick={() => actions.create.open()}>
			<PlusIcon /> Add Department
		</Button>
	);
}

export default CreateDepartmentButton;
