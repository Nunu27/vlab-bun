import { Button } from "@web/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useDeviceCategoryModalStore } from "../../stores/device-category-modal-store";

export default function CreateDeviceCategoryButton() {
	const store = useDeviceCategoryModalStore();
	const actions = store.use.actions();

	return (
		<Button onClick={() => actions.create.open()}>
			<PlusIcon className="w-4 h-4 mr-2" />
			Add Category
		</Button>
	);
}
