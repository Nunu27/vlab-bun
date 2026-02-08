import { Button } from "@web/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useAdminModalStore } from "../../stores/admin-modal-store";

export function CreateAdminButton() {
	const actions = useAdminModalStore().use.actions();

	return (
		<Button onClick={actions.create.open}>
			<PlusIcon className="w-4 h-4 mr-2" />
			Create Admin
		</Button>
	);
}
