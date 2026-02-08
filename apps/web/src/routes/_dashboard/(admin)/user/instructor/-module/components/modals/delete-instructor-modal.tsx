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
				queryClient.invalidateQueries({
					queryKey: ["user", "instructor", "pagination"],
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
						instructor account "{data.name}" (NIP: {data.nip}) and remove all
						their related application data from the server.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant="destructive"
							onClick={() => mutate()}
							disabled={isPending}
						>
							{isPending ? "Deleting..." : "Delete"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
