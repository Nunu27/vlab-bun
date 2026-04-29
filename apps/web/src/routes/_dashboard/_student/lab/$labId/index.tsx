import { createFileRoute } from "@tanstack/react-router";
import { MarkdownViewer } from "@web/components/markdown-viewer";
import { PageHeading } from "@web/components/sections/page-heading";
import { Card, CardContent } from "@web/components/ui/card";
import api from "@web/lib/api";
import { queryClient } from "@web/lib/query";
import { LabAttachmentsCard } from "../../../-module/components/cards/lab-attachments-card";
import { LabDetailsCard } from "../../../-module/components/cards/lab-details-card";
import { LabSessionHistoryCard } from "../-module/components/cards/lab-session-history-card";
import { EnrollButton } from "./-module/components/buttons/enroll-button";

export const Route = createFileRoute("/_dashboard/_student/lab/$labId/")({
	staticData: {
		breadcrumbs: [
			{ title: "Lab" },
			{ title: (data) => data.get("name") ?? "..." },
		],
	},
	loader: async ({ params: { labId }, context }) => {
		const [{ name }] = await Promise.all([
			api.lab({ labId }).get.ensureQueryData(queryClient),
			api.lab({ labId }).session.get.ensureQueryData(queryClient),
		]);
		context.breadcrumbData.set("name", name);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { labId } = Route.useParams();
	const { data: lab } = api.lab({ labId }).get.useSuspenseQuery();
	const { data: sessions } = api.lab({ labId }).session.get.useSuspenseQuery();

	return (
		<div className="flex h-full flex-col gap-6">
			<PageHeading
				title={lab.name}
				back={{ to: "/lab/browse" }}
				actions={<EnrollButton labId={labId} enrolled={lab.enrolled} />}
			/>

			<div className="grid gap-6 xl:grid-cols-3">
				<div className="space-y-4 xl:col-span-2">
					<Card className="overflow-hidden pt-0">
						{lab.cover && (
							<div className="aspect-video w-full overflow-hidden bg-muted">
								<img
									src={`/api/file/${lab.cover}`}
									alt={lab.name}
									className="size-full object-cover"
								/>
							</div>
						)}
						<CardContent>
							<MarkdownViewer
								value={lab.content || "No description provided."}
							/>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4 xl:col-span-1">
					<LabDetailsCard
						date={lab.date}
						sessionDuration={lab.sessionDuration}
						maxAttempt={lab.maxAttempt}
						instructorName={lab.instructor?.name ?? "Unknown"}
					/>

					{lab.enrolled && (
						<LabSessionHistoryCard
							labId={labId}
							maxAttempt={lab.maxAttempt}
							sessions={sessions}
							date={lab.date}
							isPublished={lab.isPublished}
						/>
					)}

					<LabAttachmentsCard attachments={lab.attachments} />
				</div>
			</div>
		</div>
	);
}
