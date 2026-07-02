import { formatDuration } from "@web/lib/utils";
import { Clock } from "lucide-react";
import { useEffect } from "react";
import { useCountdown } from "usehooks-ts";

export function SessionTimer({ dueDate }: { dueDate: Date }) {
	const countStart = Math.round((dueDate.getTime() - Date.now()) / 1000);
	const [timeLeft, { startCountdown }] = useCountdown({ countStart });

	useEffect(() => {
		startCountdown();
	}, [startCountdown]);

	return (
		<div
			data-tour="session-timer"
			className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm"
		>
			<Clock className="size-4 text-muted-foreground" />
			<span
				className={
					timeLeft < 300
						? "font-medium font-mono text-destructive tabular-nums"
						: "font-medium font-mono tabular-nums"
				}
			>
				{formatDuration(timeLeft)}
			</span>
		</div>
	);
}
