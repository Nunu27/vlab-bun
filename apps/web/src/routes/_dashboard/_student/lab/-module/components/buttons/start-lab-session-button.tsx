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
import { WaitingDistraction } from "./waiting-distraction";

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
	const [hasFailed, setHasFailed] = useState(false);
	const [waitAttempt, setWaitAttempt] = useState<number | null>(null);
	const [disposeFn, setDisposeFn] = useState<(() => void) | null>(null);
	const [now, setNow] = useState(() => Date.now());

	const isHighDemand =
		isLoading &&
		logs.some(
			(log) => log.type === "warn" && log.message.includes("High demand"),
		);

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
		setHasFailed(false);
		setWaitAttempt(null);
		setDisposeFn(() => dispose);

		send({
			params: { id: labId },
			onError: (error) => {
				setLogs((prev) => [...prev, { type: "error", message: error }]);
				setIsLoading(false);
				setHasFailed(true);
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
				warn: (msg) => {
					const attemptMatch = msg.match(/attempt (\d+)/);
					if (attemptMatch) setWaitAttempt(Number(attemptMatch[1]));
					return setLogs((prev) => [...prev, { type: "warn", message: msg }]);
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
						<DialogTitle>
							{hasFailed
								? "Failed to start lab session"
								: "Starting Lab Session..."}
						</DialogTitle>
					</DialogHeader>

					<div className="flex aspect-video w-full overflow-hidden bg-slate-950">
						<LogViewer
							logs={logs}
							emptyMessage="Initializing connection sequence..."
							className="aspect-auto w-0 flex-1"
						/>
						<WaitingDistraction active={isHighDemand} sessionKey={open} />
					</div>

					{isHighDemand && waitAttempt !== null && (
						<p className="px-6 text-muted-foreground text-xs">
							Still waiting for an available worker node — retry attempt{" "}
							{waitAttempt}, retrying automatically...
						</p>
					)}

					<DialogFooter className="p-4 pt-0">
						<DialogClose asChild>
							<Button variant="secondary" disabled={isLoading}>
								Cancel
							</Button>
						</DialogClose>
						{hasFailed && <Button onClick={handleStartPhase}>Retry</Button>}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
