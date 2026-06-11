import { useQueryClient } from "@tanstack/react-query";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { PageHeading } from "@web/components/sections/page-heading";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web/components/ui/table";
import { useWSEvent } from "@web/hooks/ws";
import api from "@web/lib/api";
import { cn } from "@web/lib/utils";
import { useAuthStore } from "@web/stores/auth-store";
import {
	ActivityIcon,
	BoxIcon,
	CpuIcon,
	DatabaseIcon,
	HardDriveIcon,
	ServerIcon,
} from "lucide-react";
import { RadialStatCard } from "../../../-module/components/cards/radial-stat-card";
import { StatCard } from "../../../-module/components/cards/stat-card";
import { workerColumns } from "../columns";

function formatMemory(mb: number) {
	if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
	return `${Math.round(mb)} MB`;
}

function getMetricColorHex(percent: number) {
	if (percent >= 85) return "#ef4444"; // red-500
	if (percent >= 50) return "#f97316"; // orange-500
	return "#10b981"; // emerald-500
}

function AdminDashboardPage() {
	const queryClient = useQueryClient();
	const { data } = api.dashboard.admin.get.useSuspenseQuery();
	const user = useAuthStore.use.user();

	const connectedWorkers = data.workers.filter((w) => w.status === "online");

	const activeLabs = connectedWorkers.reduce((acc, w) => acc + w.activeLabs, 0);
	const activeNodes = connectedWorkers.reduce(
		(acc, w) => acc + w.activeNodes,
		0,
	);

	const totalCpuCores = connectedWorkers.reduce(
		(acc, w) => acc + w.cpuCores,
		0,
	);
	const usedCpuCores = connectedWorkers.reduce(
		(acc, w) => acc + (w.cpuCores * Number(w.cpuUsagePercent)) / 100,
		0,
	);
	const cpuUsagePercent =
		totalCpuCores > 0 ? (usedCpuCores / totalCpuCores) * 100 : 0;

	const totalMemoryMB = connectedWorkers.reduce(
		(acc, w) => acc + w.memoryMB,
		0,
	);
	const usedMemoryMB = connectedWorkers.reduce(
		(acc, w) => acc + (w.memoryMB * Number(w.memoryUsagePercent)) / 100,
		0,
	);
	const memoryUsagePercent =
		totalMemoryMB > 0 ? (usedMemoryMB / totalMemoryMB) * 100 : 0;

	const totalStorageMB = connectedWorkers.reduce(
		(acc, w) => acc + w.storageMB,
		0,
	);
	const usedStorageMB = connectedWorkers.reduce(
		(acc, w) => acc + (w.storageMB * Number(w.storageUsagePercent)) / 100,
		0,
	);
	const storageUsagePercent =
		totalStorageMB > 0 ? (usedStorageMB / totalStorageMB) * 100 : 0;

	useWSEvent("admin:worker:new", {
		handler: (worker) => {
			api.dashboard.admin.get.setQueryData(queryClient, (oldData) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					workers: [worker, ...oldData.workers],
				};
			});
		},
	});

	useWSEvent("admin:worker:status", {
		handler: (worker) => {
			api.dashboard.admin.get.setQueryData(queryClient, (oldData) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					workers: oldData.workers.map((w) =>
						w.id === worker.id
							? {
									...w,
									status: worker.status,
									lastSeen: worker.lastSeen ?? w.lastSeen,
								}
							: w,
					),
				};
			});
		},
	});

	useWSEvent("admin:worker:metrics", {
		handler: (metrics) => {
			api.dashboard.admin.get.setQueryData(queryClient, (oldData) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					workers: oldData.workers.map((w) =>
						w.id === metrics.id ? { ...w, ...metrics } : w,
					),
				};
			});
		},
	});

	const table = useReactTable({
		data: data.workers,
		columns: workerColumns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="flex flex-col gap-6">
			<PageHeading
				title={`Welcome back, ${user?.name}`}
				subtitle="Statistics and infrastructure overview for the virtual lab environment."
			/>

			{/* Primary Key Metrics */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<StatCard
					title="Connected Workers"
					value={connectedWorkers.length}
					icon={<ServerIcon className="h-4 w-4 text-blue-400" />}
				/>
				<StatCard
					title="Active Labs"
					value={activeLabs}
					icon={<ActivityIcon className="h-4 w-4 text-emerald-400" />}
				/>
				<StatCard
					title="Total Nodes"
					value={activeNodes}
					icon={<BoxIcon className="h-4 w-4 text-purple-400" />}
				/>
				<RadialStatCard
					title="Total CPU Core"
					value={`${totalCpuCores} Cores`}
					description={`${cpuUsagePercent.toFixed(1)}% Used`}
					icon={<CpuIcon className="h-4 w-4 text-blue-400" />}
					progress={cpuUsagePercent}
					progressColorHex={getMetricColorHex(cpuUsagePercent)}
				/>
				<RadialStatCard
					title="Total Memory"
					value={formatMemory(totalMemoryMB)}
					description={`${memoryUsagePercent.toFixed(1)}% Used`}
					icon={<DatabaseIcon className="h-4 w-4 text-emerald-400" />}
					progress={memoryUsagePercent}
					progressColorHex={getMetricColorHex(memoryUsagePercent)}
				/>
				<RadialStatCard
					title="Total Storage"
					value={formatMemory(totalStorageMB)}
					description={`${storageUsagePercent.toFixed(1)}% Used`}
					icon={<HardDriveIcon className="h-4 w-4 text-yellow-400" />}
					progress={storageUsagePercent}
					progressColorHex={getMetricColorHex(storageUsagePercent)}
				/>
			</div>

			<Card className="border-border/50 bg-card">
				<CardHeader>
					<CardTitle>Worker List</CardTitle>
					<CardDescription>
						Monitor real-time status and resource usage of lab workers.
					</CardDescription>
				</CardHeader>
				<Table className="table-fixed">
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								key={headerGroup.id}
								className="border-border/50 hover:bg-transparent"
							>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className="font-semibold text-muted-foreground text-xs"
										style={{
											width:
												header.getSize() !== 150 ? header.getSize() : undefined,
										}}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className={cn(
										"border-border/50 hover:bg-muted/20",
										row.original.status === "offline" && "opacity-50",
									)}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											key={cell.id}
											style={{
												width:
													cell.column.columnDef.size !== 150
														? cell.column.getSize()
														: undefined,
											}}
											className={
												cell.column.id === "id" ? "font-medium" : undefined
											}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={workerColumns.length}
									className="py-8 text-center text-muted-foreground"
								>
									No workers connected
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

export default AdminDashboardPage;
