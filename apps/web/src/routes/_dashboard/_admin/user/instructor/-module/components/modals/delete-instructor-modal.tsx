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
import { useInstructorModalStore } from "../../stores/instructor-modal-store";

export function DeleteInstructorModal() {
	const store = useInstructorModalStore();
	const { open, data } = useModalState(store.use.delete());
	const actions = store.use.actions();
	const queryClient = useQueryClient();

	const { mutate, isPending } = api.user
		.instructor({
			id: data?.id ?? "",
		})
		.delete.useMutation({
			onSuccess: () => {
				api.user.instructor.pagination.post.invalidateQuery(queryClient);
				actions.delete.close();
			},
		});

	if (!data) return null;

	return (
		<AlertDialog open={open} onOpenChange={actions.delete.close}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Instructor</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete the
						instructor account "{data.name}" (NIP: {data.nip}) and remove all
						their related application data from the server.
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
