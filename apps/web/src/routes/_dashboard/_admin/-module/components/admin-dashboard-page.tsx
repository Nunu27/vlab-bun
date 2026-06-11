import { useQueryClient } from "@tanstack/react-query";
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
import { useAuthStore } from "@web/stores/auth-store";
import {
	Activity,
	ActivityIcon,
	BarChart2Icon,
	Box,
	BoxIcon,
	FlaskConicalIcon,
	MonitorIcon,
	ServerIcon,
	UsersIcon,
} from "lucide-react";
import { StatCard } from "../../../-module/components/cards/stat-card";

function getProgressColor(percent: number) {
	if (percent >= 85) return "bg-red-500";
	if (percent >= 50) return "bg-orange-500";
	return "bg-blue-500";
}

function getMemoryColor(percent: number) {
	if (percent >= 85) return "bg-orange-500";
	if (percent >= 50) return "bg-emerald-500";
	return "bg-emerald-400";
}

function AdminDashboardPage() {
	const queryClient = useQueryClient();
	const { data } = api.dashboard.admin.get.useSuspenseQuery();
	const user = useAuthStore.use.user();

	const totalUsers =
		data.users.admin + data.users.instructor + data.users.student;

	const activeLabs = data.workers.reduce((acc, w) => acc + w.activeLabs, 0);
	const activeNodes = data.workers.reduce((acc, w) => acc + w.activeNodes, 0);
	const avgCpuLoad =
		data.workers.length > 0
			? data.workers.reduce((acc, w) => acc + Number(w.cpuUsagePercent), 0) /
				data.workers.length
			: 0;

	useWSEvent("admin:worker:new", {
		handler: (worker) => {
			api.dashboard.admin.get.setQueryData(queryClient, (oldData) => {
				if (!oldData) return oldData;
				const exists = oldData.workers.some((w) => w.id === worker.id);
				return {
					...oldData,
					workers: (exists
						? oldData.workers.map((w) =>
								w.id === worker.id ? ({ ...w, ...worker } as typeof w) : w,
							)
						: [
								worker,
								...oldData.workers,
							]) as unknown as typeof oldData.workers,
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
							? ({ ...w, status: worker.status } as typeof w)
							: w,
					) as unknown as typeof oldData.workers,
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
						w.id === metrics.id ? ({ ...w, ...metrics } as typeof w) : w,
					) as unknown as typeof oldData.workers,
				};
			});
		},
	});

	return (
		<div className="flex flex-col gap-6">
			<PageHeading
				title={`Welcome back, ${user?.name}`}
				subtitle="Statistics and infrastructure overview for the virtual lab environment."
			/>

			{/* Primary Key Metrics */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title="Total Users"
					value={totalUsers}
					description="Across all platform roles"
					icon={<UsersIcon className="h-4 w-4 text-primary" />}
				/>
				<StatCard
					title="Total Labs"
					value={data.labs.total}
					description="Created by instructors"
					icon={<FlaskConicalIcon className="h-4 w-4 text-primary" />}
				/>
				<StatCard
					title="Active Sessions"
					value={data.sessions.active}
					description="Currently running labs"
					icon={<ActivityIcon className="h-4 w-4 text-emerald-500" />}
					trend={data.sessions.active > 0 ? "LIVE" : undefined}
					highlight={data.sessions.active > 0}
				/>
				<StatCard
					title="Device Templates"
					value={data.templates}
					description={`In ${data.deviceCategories} categories`}
					icon={<MonitorIcon className="h-4 w-4 text-primary" />}
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title="Total Workers"
					value={data.workers.length}
					icon={<ServerIcon className="h-4 w-4 text-blue-400" />}
				/>
				<StatCard
					title="Active Worker Labs"
					value={activeLabs}
					icon={<ActivityIcon className="h-4 w-4 text-emerald-400" />}
				/>
				<StatCard
					title="Total Nodes"
					value={activeNodes}
					icon={<BoxIcon className="h-4 w-4 text-purple-400" />}
				/>
				<StatCard
					title="Avg CPU Load"
					value={`${avgCpuLoad.toFixed(1)}%`}
					icon={<BarChart2Icon className="h-4 w-4 text-yellow-400" />}
				/>
			</div>

			<Card className="border-border/50 bg-card">
				<CardHeader>
					<CardTitle>Connected Workers</CardTitle>
					<CardDescription>
						Monitor real-time status and resource usage of lab workers.
					</CardDescription>
				</CardHeader>
				<Table>
					<TableHeader>
						<TableRow className="border-border/50 hover:bg-transparent">
							<TableHead className="w-[300px] font-semibold text-muted-foreground text-xs">
								WORKER NODE
							</TableHead>
							<TableHead className="font-semibold text-muted-foreground text-xs">
								CPU
							</TableHead>
							<TableHead className="font-semibold text-muted-foreground text-xs">
								MEMORY
							</TableHead>
							<TableHead className="pr-6 text-right font-semibold text-muted-foreground text-xs">
								WORKLOAD
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.workers.map((worker) => (
							<TableRow
								key={worker.id}
								className="border-border/50 hover:bg-muted/20"
							>
								<TableCell className="font-medium">
									<div className="flex items-center gap-2">
										<ServerIcon className="h-4 w-4 text-primary" />
										{worker.id}
									</div>
								</TableCell>
								<TableCell>
									<div className="flex w-48 items-center gap-3">
										<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
											<div
												className={`h-full rounded-full ${getProgressColor(Number(worker.cpuUsagePercent))}`}
												style={{
													width: `${Math.max(Number(worker.cpuUsagePercent), 2)}%`,
												}}
											/>
										</div>
										<span className="w-10 text-muted-foreground text-xs">
											{worker.cpuUsagePercent}%
										</span>
									</div>
								</TableCell>
								<TableCell>
									<div className="flex w-48 items-center gap-3">
										<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
											<div
												className={`h-full rounded-full ${getMemoryColor(Number(worker.memoryUsagePercent))}`}
												style={{
													width: `${Math.max(Number(worker.memoryUsagePercent), 2)}%`,
												}}
											/>
										</div>
										<span className="w-10 text-muted-foreground text-xs">
											{worker.memoryUsagePercent}%
										</span>
									</div>
								</TableCell>
								<TableCell className="pr-6 text-right">
									<div className="flex items-center justify-end gap-4 text-muted-foreground text-xs">
										<span className="flex items-center gap-1.5">
											<Activity className="h-3.5 w-3.5 text-emerald-400" />{" "}
											{worker.activeLabs}
										</span>
										<span className="flex items-center gap-1.5">
											<Box className="h-3.5 w-3.5 text-purple-400" />{" "}
											{worker.activeNodes}
										</span>
									</div>
								</TableCell>
							</TableRow>
						))}
						{data.workers.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={4}
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
