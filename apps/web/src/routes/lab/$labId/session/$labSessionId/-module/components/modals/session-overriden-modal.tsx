import { Link } from "@tanstack/react-router";
import { Button } from "@web/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@web/components/ui/dialog";
import { useLabSessionModalStore } from "../../store/lab-session-modal-store";

function SessionOverridenModal() {
	const store = useLabSessionModalStore();
	const open = store.use.overridden((s) => !!s);

	return (
		<Dialog open={open}>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Session Overridden</DialogTitle>
					<DialogDescription>
						This session has been taken over by another instance. You can no
						longer interact with it from this window.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button asChild>
						<Link to="/">Go to Dashboard</Link>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default SessionOverridenModal;
