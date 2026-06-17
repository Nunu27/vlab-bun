import { PageHeading } from "@web/components/sections/page-heading";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import api from "@web/lib/api";
import { StatCard } from "@web/routes/_dashboard/-module/components/cards/stat-card";
import { useAuthStore } from "@web/stores/auth-store";
import {
	ActivityIcon,
	FlaskConicalIcon,
	GraduationCapIcon,
	MonitorIcon,
} from "lucide-react";

function InstructorDashboardPage() {
	const { data } = api.dashboard.instructor.get.useSuspenseQuery();
	const user = useAuthStore.use.user();

	return (
		<div className="flex flex-col gap-6">
			<PageHeading
				title={`Welcome back, ${user?.name}`}
				subtitle="Statistics for your virtual lab content."
			/>

			{/* Primary Key Metrics */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title="Total Labs"
					value={data.labs.total}
					description="Your published and draft labs"
					icon={<FlaskConicalIcon className="h-4 w-4" />}
				/>
				<StatCard
					title="Active Sessions"
					value={data.sessions.active}
					description="Currently running in your labs"
					icon={<ActivityIcon className="h-4 w-4" />}
				/>
				<StatCard
					title="Total Students"
					value={data.students}
					description="Enrolled across your labs"
					icon={<GraduationCapIcon className="h-4 w-4" />}
				/>
				<StatCard
					title="Average Score"
					value={Math.round(data.sessions.avgScore)}
					description="Overall student performance"
					icon={<MonitorIcon className="h-4 w-4" />}
				/>
			</div>

			<div className="grid gap-4">
				{/* Expanded Lab & Session Details */}
				<Card className="border-border/50 bg-card">
					<CardHeader>
						<CardTitle>Content & Execution</CardTitle>
						<CardDescription>
							Detailed breakdown of your laboratory content and session outcomes
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
			</div>
		</div>
	);
}

export default InstructorDashboardPage;
