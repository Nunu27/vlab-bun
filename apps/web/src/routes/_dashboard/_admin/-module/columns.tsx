import type { ExtractTreatyData } from "@jawit/query/types";
import { createColumnHelper } from "@tanstack/react-table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web/components/ui/tooltip";
import { formatTimeAgo } from "@web/helper/date";
import type api from "@web/lib/api";
import { cn } from "@web/lib/utils";
import { Activity, Box, ServerIcon } from "lucide-react";

type WorkerData = ExtractTreatyData<
	typeof api.dashboard.admin.get
>["workers"][0];

const columnHelper = createColumnHelper<WorkerData>();

function getMetricColor(percent: number) {
	if (percent >= 85) return "bg-red-500";
	if (percent >= 50) return "bg-orange-500";
	return "bg-emerald-500";
}

function formatMemory(mb: number) {
	if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
	return `${Math.round(mb)} MB`;
}

export const workerColumns = [
	columnHelper.accessor("id", {
		header: "WORKER NODE",
		size: 250,
		cell: (info) => {
			const worker = info.row.original;
			const isOffline = worker.status === "offline";
			return (
				<div className="flex items-center gap-2 font-medium">
					<div className="relative flex items-center justify-center">
						<ServerIcon
							className={cn(
								"h-4 w-4",
								isOffline ? "text-muted-foreground" : "text-primary",
							)}
						/>
						<div
							className={cn(
								"absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border border-background",
								isOffline ? "bg-muted-foreground" : "bg-emerald-500",
							)}
						/>
					</div>
					<span className={cn(isOffline && "text-muted-foreground")}>
						{worker.id}
					</span>
				</div>
			);
		},
	}),
	columnHelper.accessor("cpuUsagePercent", {
		header: "CPU",
		size: 150,
		cell: (info) => {
			const worker = info.row.original;
			const isOffline = worker.status === "offline";
			const cpuUsage = isOffline ? 0 : Number(worker.cpuUsagePercent);
			return (
				<div className="flex w-full flex-col gap-1.5 pr-4 xl:pr-8">
					<div className="flex items-center justify-between text-muted-foreground text-xs">
						<span>{worker.cpuCores} Cores</span>
						<span className="font-medium text-foreground">
							{cpuUsage.toFixed(1)}%
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							className={cn(
								"h-full rounded-full",
								isOffline ? "bg-muted-foreground/30" : getMetricColor(cpuUsage),
							)}
							style={{ width: `${Math.max(cpuUsage, isOffline ? 0 : 2)}%` }}
						/>
					</div>
				</div>
			);
		},
	}),
	columnHelper.accessor("memoryUsagePercent", {
		header: "MEMORY",
		size: 150,
		cell: (info) => {
			const worker = info.row.original;
			const isOffline = worker.status === "offline";
			const memUsage = isOffline ? 0 : Number(worker.memoryUsagePercent);
			return (
				<div className="flex w-full flex-col gap-1.5 pr-4 xl:pr-8">
					<div className="flex items-center justify-between text-muted-foreground text-xs">
						<span>{formatMemory(worker.memoryMB)}</span>
						<span className="font-medium text-foreground">
							{memUsage.toFixed(1)}%
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							className={cn(
								"h-full rounded-full",
								isOffline ? "bg-muted-foreground/30" : getMetricColor(memUsage),
							)}
							style={{ width: `${Math.max(memUsage, isOffline ? 0 : 2)}%` }}
						/>
					</div>
				</div>
			);
		},
	}),
	columnHelper.accessor("storageUsagePercent", {
		header: "STORAGE",
		size: 150,
		cell: (info) => {
			const worker = info.row.original;
			const isOffline = worker.status === "offline";
			const storageUsage = isOffline ? 0 : Number(worker.storageUsagePercent);
			return (
				<div className="flex w-full flex-col gap-1.5 pr-4 xl:pr-8">
					<div className="flex items-center justify-between text-muted-foreground text-xs">
						<span>{formatMemory(worker.storageMB)}</span>
						<span className="font-medium text-foreground">
							{storageUsage.toFixed(1)}%
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							className={cn(
								"h-full rounded-full",
								isOffline
									? "bg-muted-foreground/30"
									: getMetricColor(storageUsage),
							)}
							style={{ width: `${Math.max(storageUsage, isOffline ? 0 : 2)}%` }}
						/>
					</div>
				</div>
			);
		},
	}),
	columnHelper.display({
		id: "workload",
		header: "WORKLOAD",
		size: 120,
		cell: (info) => {
			const worker = info.row.original;
			const isOffline = worker.status === "offline";
			return (
				<div className="flex items-center gap-4 text-muted-foreground text-xs">
					<TooltipProvider delayDuration={100}>
						<Tooltip>
							<TooltipTrigger className="flex cursor-default items-center gap-1.5">
								<Activity
									className={cn(
										"h-3.5 w-3.5",
										!isOffline && "text-emerald-400",
									)}
								/>{" "}
								{isOffline ? 0 : worker.activeLabs}
							</TooltipTrigger>
							<TooltipContent>
								<p>Active Labs</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger className="flex cursor-default items-center gap-1.5">
								<Box
									className={cn("h-3.5 w-3.5", !isOffline && "text-purple-400")}
								/>{" "}
								{isOffline ? 0 : worker.activeNodes}
							</TooltipTrigger>
							<TooltipContent>
								<p>Active Nodes</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			);
		},
	}),
	columnHelper.accessor("lastSeen", {
		header: () => <div className="text-right">LAST SEEN</div>,
		size: 150,
		cell: (info) => {
			const worker = info.row.original;
			const isOffline = worker.status === "offline";
			return (
				<div className="flex items-center justify-end text-muted-foreground text-sm">
					{isOffline ? formatTimeAgo(new Date(worker.lastSeen)) : "Now"}
				</div>
			);
		},
	}),
];
