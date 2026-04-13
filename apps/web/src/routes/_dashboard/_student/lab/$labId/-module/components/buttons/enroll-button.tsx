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
	AlertDialogTrigger,
} from "@web/components/ui/alert-dialog";
import { Button } from "@web/components/ui/button";
import api from "@web/lib/api";

interface EnrollButtonProps {
	labId: string;
	enrolled: boolean;
}

export function EnrollButton({ labId, enrolled }: EnrollButtonProps) {
	const queryClient = useQueryClient();

	const { mutate, isPending } = api
		.lab({ labId })
		.enrollment[enrolled ? "delete" : "post"].useMutation({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lab"] }),
		});

	if (!enrolled) {
		return (
			<Button
				variant="default"
				className="min-w-24"
				onClick={() => mutate(undefined)}
				disabled={isPending}
			>
				{isPending ? "Updating..." : "Enroll"}
			</Button>
		);
	}

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="destructive" className="min-w-24" disabled={isPending}>
					{isPending ? "Updating..." : "Unenroll"}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Are you sure you want to unenroll?
					</AlertDialogTitle>
					<AlertDialogDescription>
						This action might result in losing access to the lab environment and
						your progress within the lab.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={(e) => {
							e.preventDefault();
							mutate(undefined);
						}}
						disabled={isPending}
					>
						{isPending ? "Unenrolling..." : "Unenroll"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
