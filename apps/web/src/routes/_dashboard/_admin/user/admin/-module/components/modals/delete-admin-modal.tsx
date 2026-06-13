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
import { useAdminModalStore } from "../../stores/admin-modal-store";

export function DeleteAdminModal() {
	const store = useAdminModalStore();
	const { open, data } = useModalState(store.use.delete());
	const actions = store.use.actions();
	const queryClient = useQueryClient();

	const { mutate, isPending } = api.user
		.admin({
			id: data?.id ?? "",
		})
		.delete.useMutation({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["user", "admin", "pagination"],
				});
				actions.delete.close();
			},
		});

	if (!data) return null;

	return (
		<AlertDialog open={open} onOpenChange={actions.delete.close}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Admin</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete the admin
						account "{data.name}" and revoke all their access from the platform.
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
