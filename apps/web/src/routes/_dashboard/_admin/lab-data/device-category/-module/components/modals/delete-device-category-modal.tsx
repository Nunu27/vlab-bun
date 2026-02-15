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
import { Button } from "@web/components/ui/button";
import { useModalState } from "@web/hooks/state/use-modal-state";
import api from "@web/lib/api";
import { useDeviceCategoryModalStore } from "../../stores/device-category-modal-store";

export function DeleteDeviceCategoryModal() {
	const store = useDeviceCategoryModalStore();
	const { open, data } = useModalState(store.use.delete());
	const actions = store.use.actions();

	const queryClient = useQueryClient();

	const { mutate, isPending } = api["device-category"]({
		id: data?.id ?? "",
	}).delete.useMutation({
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["device-category", "pagination"],
			});
			actions.delete.close();
		},
	});

	if (!data) return;

	return (
		<AlertDialog open={open} onOpenChange={actions.delete.close}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete the
						device category "{data?.name}" and remove its association from the
						server. All device templates bound to this category might be
						affected.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant="destructive"
							disabled={isPending}
							onClick={() => mutate()}
						>
							{isPending ? "Deleting..." : "Delete"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
