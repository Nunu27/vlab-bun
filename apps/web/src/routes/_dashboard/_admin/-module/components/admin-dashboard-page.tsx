import { PageHeading } from "@web/components/sections/page-heading";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import api from "@web/lib/api";
import {
	ActivityIcon,
	BookOpenIcon,
	Building2Icon,
	FlaskConicalIcon,
	GraduationCapIcon,
	MonitorIcon,
	ServerIcon,
	UsersIcon,
} from "lucide-react";
import { StatCard } from "./stat-card";

function AdminDashboardPage() {
	const { data } = api.dashboard.admin.get.useSuspenseQuery();

	const totalUsers =
		data.users.admin + data.users.instructor + data.users.student;

	return (
		<div className="flex flex-col gap-4">
			<PageHeading
				title="Dashboard Overview"
				subtitle="Statistics for the virtual lab environment."
			/>

			{/* Primary Key Metrics */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title="Total Users"
					value={totalUsers}
					description="Across all platform roles"
					icon={<UsersIcon className="h-4 w-4" />}
				/>
				<StatCard
					title="Total Labs"
					value={data.labs.total}
					description="Created by instructors"
					icon={<FlaskConicalIcon className="h-4 w-4" />}
				/>
				<StatCard
					title="Active Sessions"
					value={data.sessions.active}
					description="Currently running labs"
					icon={<ActivityIcon className="h-4 w-4" />}
					trend={data.sessions.active > 0 ? "LIVE" : undefined}
					highlight={data.sessions.active > 0}
				/>
				<StatCard
					title="Device Templates"
					value={data.templates}
					description={`In ${data.deviceCategories} categories`}
					icon={<ServerIcon className="h-4 w-4" />}
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
				{/* Expanded Lab & Session Details */}
				<Card className="lg:col-span-4">
					<CardHeader>
						<CardTitle>Lab Data</CardTitle>
						<CardDescription>
							Detailed breakdown of laboratory content and execution
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="flex flex-col justify-between rounded-xl border bg-muted/40 p-5">
								<div className="flex items-center gap-2 text-muted-foreground">
									<FlaskConicalIcon className="h-5 w-5 text-primary" />
									<span className="font-semibold text-foreground">
										Laboratory Content
									</span>
								</div>
								<div className="mt-4 flex items-baseline gap-2">
									<span className="font-bold text-4xl tracking-tighter">
										{data.labs.total}
									</span>
									<span className="text-muted-foreground text-sm">Total</span>
								</div>
								<div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
									<div className="flex flex-col">
										<span className="font-medium">{data.labs.published}</span>
										<span className="text-muted-foreground">Published</span>
									</div>
									<div className="flex flex-col text-right">
										<span className="font-medium">{data.labs.draft}</span>
										<span className="text-muted-foreground">Drafts</span>
									</div>
								</div>
							</div>

							<div className="flex flex-col justify-between rounded-xl border bg-muted/40 p-5">
								<div className="flex items-center gap-2 text-muted-foreground">
									<MonitorIcon className="h-5 w-5 text-primary" />
									<span className="font-semibold text-foreground">
										Session Metrics
									</span>
								</div>
								<div className="mt-4 flex items-baseline gap-2">
									<span className="font-bold text-4xl tracking-tighter">
										{data.sessions.total}
									</span>
									<span className="text-muted-foreground text-sm">Total</span>
								</div>
								<div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
									<div className="flex flex-col">
										<span className="font-medium">
											{data.sessions.completed}
										</span>
										<span className="text-muted-foreground">Completed</span>
									</div>
									<div className="flex flex-col text-right">
										<span className="font-medium">
											{Math.round(data.sessions.avgScore)}
										</span>
										<span className="text-muted-foreground">Avg Score</span>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Organization Snapshot */}
				<Card className="lg:col-span-3">
					<CardHeader>
						<CardTitle>Academic Structure</CardTitle>
						<CardDescription>
							Organizational context and user base
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-1">
								<span className="flex items-center gap-1.5 text-muted-foreground text-sm">
									<Building2Icon className="h-4 w-4" /> Departments
								</span>
								<span className="font-semibold text-2xl">
									{data.departments}
								</span>
							</div>
							<div className="flex flex-col gap-1">
								<span className="flex items-center gap-1.5 text-muted-foreground text-sm">
									<BookOpenIcon className="h-4 w-4" /> Study Programs
								</span>
								<span className="font-semibold text-2xl">
									{data.studyPrograms}
								</span>
							</div>
						</div>

						<div className="space-y-2">
							<span className="flex items-center gap-1.5 font-medium text-muted-foreground text-sm">
								<GraduationCapIcon className="h-4 w-4" /> User Distribution
							</span>
							<div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary">
								<div
									className="bg-primary"
									style={{
										width: `${(data.users.student / totalUsers) * 100}%`,
									}}
									title={`${data.users.student} Students`}
								/>
								<div
									className="bg-primary/60"
									style={{
										width: `${(data.users.instructor / totalUsers) * 100}%`,
									}}
									title={`${data.users.instructor} Instructors`}
								/>
								<div
									className="bg-primary/30"
									style={{
										width: `${(data.users.admin / totalUsers) * 100}%`,
									}}
									title={`${data.users.admin} Admins`}
								/>
							</div>
							<div className="flex justify-between text-muted-foreground text-xs">
								<span>
									{Math.round((data.users.student / totalUsers) * 100)}%
									Students
								</span>
								<span>
									{Math.round((data.users.instructor / totalUsers) * 100)}%
									Instructors
								</span>
								<span>
									{Math.round((data.users.admin / totalUsers) * 100)}% Admins
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default AdminDashboardPage;
