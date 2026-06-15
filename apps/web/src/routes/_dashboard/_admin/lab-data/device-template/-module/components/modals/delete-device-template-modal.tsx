import { useQueryClient } from "@tanstack/react-query";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@web/components/ui/alert-dialog";
import { useModalState } from "@web/hooks/state/use-modal-state";
import api from "@web/lib/api";
import { useDeviceTemplateModalStore } from "../../stores/device-template-modal-store";

export function DeleteDeviceTemplateModal() {
	const store = useDeviceTemplateModalStore();
	const { open, data } = useModalState(store.use.delete());
	const actions = store.use.actions();

	const queryClient = useQueryClient();

	const { mutate, isPending } = api["device-template"]({
		id: data?.id ?? "",
	}).delete.useMutation({
		onSuccess: () => {
			api["device-template"].pagination.post.invalidateQuery(queryClient);
			actions.delete.close();
		},
	});

	if (!data) return null;

	return (
		<AlertDialog open={open} onOpenChange={actions.delete.close}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Device Template</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete the
						device template "{data.name}" and remove its association from the
						server.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={(e) => {
							e.preventDefault();
							mutate();
						}}
						disabled={isPending}
					>
						{isPending ? "Deleting..." : "Delete"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
