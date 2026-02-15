import { Button } from "@web/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useAdminModalStore } from "../../stores/admin-modal-store";

export function CreateAdminButton() {
	const actions = useAdminModalStore().use.actions();

	return (
		<Button onClick={actions.create.open}>
			<PlusIcon className="mr-2 h-4 w-4" />
			Create Admin
		</Button>
	);
}
