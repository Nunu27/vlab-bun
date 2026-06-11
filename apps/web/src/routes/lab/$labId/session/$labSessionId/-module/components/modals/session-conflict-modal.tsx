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
import { useWSAction } from "@web/hooks/ws";
import { useEffect } from "react";
import { useLabSessionModalStore } from "../../store/lab-session-modal-store";

function SessionConflictModal({ sessionId }: { sessionId: string }) {
	const store = useLabSessionModalStore();
	const open = store.use.conflict((s) => !!s);
	const { conflict } = store.use.actions();

	const { send: connectSession } = useWSAction(
		"lab-session:[sessionId]:connect",
	);

	useEffect(() => {
		connectSession({
			params: { sessionId },
			data: false,
			onResponse: (isConflict) => {
				if (isConflict) conflict.open("open");
			},
		});
	}, [conflict.open, connectSession, sessionId]);

	return (
		<Dialog open={open}>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Session Conflict</DialogTitle>
					<DialogDescription>
						Another instance of this lab session is currently active. Would you
						like to take over the session?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" asChild>
						<Link to="/">Go to Dashboard</Link>
					</Button>
					<Button
						onClick={() => {
							connectSession({
								params: { sessionId },
								data: true,
							});
						}}
					>
						Take Over Session
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default SessionConflictModal;
