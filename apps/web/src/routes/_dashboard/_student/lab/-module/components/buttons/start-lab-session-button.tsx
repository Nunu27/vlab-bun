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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web/components/ui/tooltip";
import { useWSAction } from "@web/hooks/ws";
import { PlayIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface StartLabSessionButtonProps {
	labId: string;
	attemptCount: number;
	maxAttempt: number | null;
	date: { from: Date | string; to: Date | string };
	isPublished?: boolean;
}

export function StartLabSessionButton({
	labId,
	attemptCount,
	maxAttempt,
	date,
	isPublished = true,
}: StartLabSessionButtonProps) {
	const navigate = useNavigate();
	const { send, dispose } = useWSAction("lab:[id]:init");

	const [open, setOpen] = useState(false);
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [disposeFn, setDisposeFn] = useState<(() => void) | null>(null);
	const [now, setNow] = useState(() => Date.now());

	const isLimitReached = maxAttempt !== null && attemptCount >= maxAttempt;
	const startTime =
		date.from instanceof Date
			? date.from.getTime()
			: new Date(date.from).getTime();
	const endTime =
		date.to instanceof Date ? date.to.getTime() : new Date(date.to).getTime();
	const disabledReason = !isPublished
		? "Lab is not published"
		: now < startTime
			? "Lab has not started yet"
			: now >= endTime
				? "Lab has ended"
				: isLimitReached
					? "Max attempts reached"
					: null;

	useEffect(() => {
		const intervalId = window.setInterval(() => setNow(Date.now()), 30_000);
		return () => window.clearInterval(intervalId);
	}, []);

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen && disposeFn) {
			disposeFn();
			setDisposeFn(null);
		}
	};

	const handleStartPhase = () => {
		if (disabledReason) return;

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
			onResponse: (sessionId) => {
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
			callbacks: {
				info: (msg) => {
					return setLogs((prev) => [...prev, { type: "info", message: msg }]);
				},
			},
		});
	};

	return (
		<>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="inline-flex">
							<Button
								onClick={handleStartPhase}
								disabled={!!disabledReason}
								className="gap-2"
							>
								<PlayIcon data-icon="inline-start" />
								Start Lab
							</Button>
						</span>
					</TooltipTrigger>
					{disabledReason && <TooltipContent>{disabledReason}</TooltipContent>}
				</Tooltip>
			</TooltipProvider>

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
