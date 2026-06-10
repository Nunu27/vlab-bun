import type { ExtractTreatyData } from "@jawit/query/types";
import { Link } from "@tanstack/react-router";
import { PageHeading } from "@web/components/sections/page-heading";
import { Button } from "@web/components/ui/button";
import { Card, CardContent } from "@web/components/ui/card";
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@web/components/ui/empty";
import api from "@web/lib/api";
import { LabCard } from "@web/routes/_dashboard/_student/lab/-module/components/lab-card";
import { useAuthStore } from "@web/stores/auth-store";
import { BookOpenIcon, FlaskConicalIcon } from "lucide-react";
import { UpcomingLabItem } from "./upcoming-lab-item";

type DashboardData = ExtractTreatyData<typeof api.dashboard.student.get>;

function StudentDashboardPage() {
	const { data } = api.dashboard.student.get.useSuspenseQuery();
	const user = useAuthStore.use.user();

	return (
		<div className="flex flex-col gap-8">
			<PageHeading
				title={`Welcome back, ${user?.name}`}
				subtitle="Overview of your learning progress and upcoming labs."
			/>

			{/* Enrolled Labs Section */}
			<section className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="font-semibold text-lg tracking-tight">
							Enrolled Labs
						</h3>
						<p className="text-muted-foreground text-sm">
							Your recently enrolled laboratory sessions.
						</p>
					</div>
					<Button variant="outline" size="sm" asChild>
						<Link to="/lab/enrolled">View All Enrolled</Link>
					</Button>
				</div>

				{data.enrolledLabs.length === 0 ? (
					<Card>
						<CardContent className="pt-6">
							<Empty className="border-0">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<BookOpenIcon className="h-6 w-6 text-muted-foreground" />
									</EmptyMedia>
									<EmptyTitle>You haven't enrolled in any labs yet</EmptyTitle>
								</EmptyHeader>
							</Empty>
						</CardContent>
					</Card>
				) : (
					<div className="flex snap-x gap-4 overflow-x-auto pb-4">
						{data.enrolledLabs.map((lab: DashboardData["enrolledLabs"][0]) => (
							<div key={lab.id} className="w-75 shrink-0 snap-start">
								<LabCard lab={lab} />
							</div>
						))}
					</div>
				)}
			</section>

			{/* Upcoming Pending Labs in a simple list view */}
			<section className="flex flex-col gap-4">
				<div>
					<h3 className="font-semibold text-lg tracking-tight">
						Upcoming Pending Labs
					</h3>
					<p className="text-muted-foreground text-sm">
						Enrolled labs incomplete and ordered by nearest deadline.
					</p>
				</div>

				<Card>
					<CardContent
						className={data.upcomingLabs.length === 0 ? "pt-6" : "p-0"}
					>
						{data.upcomingLabs.length === 0 ? (
							<Empty className="border-0">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<FlaskConicalIcon className="h-6 w-6 text-muted-foreground" />
									</EmptyMedia>
									<EmptyTitle>You have no pending labs right now</EmptyTitle>
								</EmptyHeader>
							</Empty>
						) : (
							<div className="flex flex-col divide-y">
								{data.upcomingLabs.map(
									(lab: DashboardData["upcomingLabs"][0]) => (
										<UpcomingLabItem key={lab.id} lab={lab} />
									),
								)}
							</div>
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}

export default StudentDashboardPage;
