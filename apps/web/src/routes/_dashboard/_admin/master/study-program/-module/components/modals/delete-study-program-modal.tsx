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
import { useStudyProgramModalStore } from "../../stores/study-program-modal-store";

export function DeleteStudyProgramModal() {
	const store = useStudyProgramModalStore();
	const { open, data } = useModalState(store.use.delete());
	const actions = store.use.actions();

	const queryClient = useQueryClient();
	const { mutate, isPending } = api["study-program"]({
		id: data?.id ?? "",
	}).delete.useMutation({
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["study-program", "pagination"],
			});
			actions.delete.close();
		},
	});

	if (!data) return;

	return (
		<AlertDialog open={open} onOpenChange={actions.delete.close}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Study Program</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete <strong>{data.name}</strong>? This
						action cannot be undone and may affect related entities.
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
