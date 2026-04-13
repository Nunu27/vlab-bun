import { useNavigate } from "@tanstack/react-router";
import { type LogEntry, LogViewer } from "@web/components/log-viewer";
import { Button } from "@web/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@web/components/ui/dialog";
import { useWSAction } from "@web/hooks/ws";
import { PlayIcon } from "lucide-react";
import { useState } from "react";

interface StartLabSessionButtonProps {
	labId: string;
	attemptCount: number;
	maxAttempt: number | null;
}

export function StartLabSessionButton({
	labId,
	attemptCount,
	maxAttempt,
}: StartLabSessionButtonProps) {
	const navigate = useNavigate();
	const { send, dispose } = useWSAction("lab:[id]:init");

	const [open, setOpen] = useState(false);
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [disposeFn, setDisposeFn] = useState<(() => void) | null>(null);

	const isLimitReached = maxAttempt !== null && attemptCount >= maxAttempt;

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen && disposeFn) {
			disposeFn();
			setDisposeFn(null);
		}
	};

	const handleStartPhase = () => {
		setOpen(true);
		setLogs([]);
		setIsLoading(true);
		setDisposeFn(() => dispose);

		send({
			params: { id: labId },
			onError: (error) => {
				setLogs((prev) => [...prev, { type: "error", message: error }]);
				setIsLoading(false);
			},
			callbacks: {
				info: (msg) =>
					setLogs((prev) => [...prev, { type: "info", message: msg }]),
				id: (sessionId) => {
					setIsLoading(false);
					setLogs((prev) => [
						...prev,
						{ type: "info", message: "Redirecting to session..." },
					]);
					navigate({
						to: "/lab/$labId/session/$labSessionId",
						params: { labId, labSessionId: sessionId },
					});
				},
			},
		});
	};

	return (
		<>
			<Button
				onClick={handleStartPhase}
				disabled={isLimitReached}
				className="gap-2"
			>
				<PlayIcon className="h-4 w-4" />
				Start Lab
			</Button>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="p-0 sm:max-w-200">
					<DialogHeader className="p-6 pb-0">
						<DialogTitle>Starting Lab Session...</DialogTitle>
					</DialogHeader>

					<div className="relative aspect-video w-full overflow-hidden bg-slate-950">
						<LogViewer
							logs={logs}
							emptyMessage="Initializing connection sequence..."
						/>
					</div>

					<DialogFooter className="p-4 pt-0">
						<DialogClose asChild>
							<Button variant="secondary" disabled={isLoading}>
								Cancel
							</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
