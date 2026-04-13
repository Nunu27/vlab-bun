import { MarkdownViewer } from "@web/components/markdown-viewer";
import { Card, CardContent } from "@web/components/ui/card";
import { LabAttachmentsCard } from "@web/routes/_dashboard/-module/components/cards/lab-attachments-card";
import { LabDetailsCard } from "@web/routes/_dashboard/-module/components/cards/lab-details-card";
import type { LabDetail } from "../../../../-module/types";

export function OverviewTab({ lab }: { lab: LabDetail }) {
	return (
		<div className="grid gap-6 xl:grid-cols-3">
			<div className="space-y-4 xl:col-span-2">
				<Card>
					<CardContent>
						<MarkdownViewer value={lab.content || "No description provided."} />
					</CardContent>
				</Card>
			</div>

			<div className="space-y-4 xl:col-span-1">
				<LabDetailsCard
					date={lab.date}
					sessionDuration={lab.sessionDuration}
					maxAttempt={lab.maxAttempt}
					isPublished={lab.isPublished}
					showStatus={true}
				/>

				<LabAttachmentsCard attachments={lab.attachments} />
			</div>
		</div>
	);
}
