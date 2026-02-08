import { useMutation } from "@tanstack/react-query";
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
import { useAuthStore } from "@web/stores/auth-store";

interface LogoutConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function LogoutConfirmDialog({
	open,
	onOpenChange,
}: LogoutConfirmDialogProps) {
	const { logout } = useAuthStore.use.actions();
	const { mutate, isPending } = useMutation({ mutationFn: logout });

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
					<AlertDialogDescription>
						You will be redirected to the login page.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={isPending}
						onClick={(e) => {
							e.preventDefault();
							mutate();
						}}
					>
						{isPending ? "Logging out..." : "Log out"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
