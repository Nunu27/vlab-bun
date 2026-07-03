import { cn } from "@web/lib/utils";
import { useEffect, useRef } from "react";

export type LogLevel = "info" | "warn" | "error";
export type LogEntry = { type: LogLevel; message: string };

interface LogViewerProps {
	logs: LogEntry[];
	emptyMessage?: string;
	className?: string;
}

export function LogViewer({ logs, emptyMessage, className }: LogViewerProps) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ block: "end" });
	}, [logs]);

	return (
		<div
			className={cn(
				"flex aspect-video w-full flex-col overflow-y-auto bg-slate-950 p-4 font-mono text-xs",
				className,
			)}
		>
			{logs.length === 0 && emptyMessage && (
				<div className="text-slate-500">{emptyMessage}</div>
			)}
			{logs.map((log, index) => (
				<div
					key={index.toString()}
					className={`mb-1 ${
						log.type === "error"
							? "text-red-400"
							: log.type === "warn"
								? "text-yellow-400"
								: "text-slate-300"
					}`}
				>
					<span className="mr-2 opacity-50">
						[{new Date().toLocaleTimeString()}]
					</span>
					<span className="mr-2 font-semibold uppercase opacity-75">
						[{log.type}]
					</span>
					{log.message}
				</div>
			))}
			<div ref={bottomRef} />
		</div>
	);
}
