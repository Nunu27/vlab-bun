import type { ExtractTreatyData } from "@jawit/query/types";
import { Link } from "@tanstack/react-router";
import { Badge } from "@web/components/ui/badge";
import type api from "@web/lib/api";
import { format, isSameDay } from "date-fns";
import { CheckCircle2Icon, PlayCircleIcon } from "lucide-react";

type SessionType = ExtractTreatyData<
	ReturnType<typeof api.lab>["session"]["get"]
>[number];

interface LabSessionHistoryItemProps {
	session: SessionType;
	labId: string;
}

export function LabSessionHistoryItem({
	session,
	labId,
}: LabSessionHistoryItemProps) {
	const isCompleted = !!session.submittedAt;
	const startDate = new Date(session.createdAt);

	let dateDisplay = format(startDate, "dd MMM yyyy • HH:mm");
	if (isCompleted && session.submittedAt) {
		const submitDate = new Date(session.submittedAt);
		if (isSameDay(startDate, submitDate)) {
			dateDisplay = `${format(startDate, "dd MMM yyyy • HH:mm")} - ${format(
				submitDate,
				"HH:mm",
			)}`;
		} else {
			dateDisplay = `${format(startDate, "dd MMM yyyy, HH:mm")} - ${format(
				submitDate,
				"dd MMM yyyy, HH:mm",
			)}`;
		}
	}

	const content = (
		<>
			<div className="flex items-center justify-between">
				{isCompleted ? (
					<Badge
						variant="outline"
						className="gap-1 border-primary/50 text-foreground/70"
					>
						<CheckCircle2Icon className="h-3 w-3" />
						Completed
					</Badge>
				) : (
					<Badge
						variant="outline"
						className="gap-1 border-blue-500/50 text-blue-500"
					>
						<PlayCircleIcon className="h-3 w-3" />
						In Progress
					</Badge>
				)}
				<div className="font-medium text-muted-foreground text-sm">
					<span className="font-semibold text-foreground">
						{session.score ?? "-"}
					</span>{" "}
					%
				</div>
			</div>
			<div className="text-muted-foreground text-xs">{dateDisplay}</div>
		</>
	);

	return isCompleted ? (
		<div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
			{content}
		</div>
	) : (
		<Link
			to="/lab/$labId/session/$labSessionId"
			params={{ labId, labSessionId: session.id }}
			className="group flex flex-col gap-2 rounded-lg border-2 border-blue-500/30 bg-blue-500/5 p-3 transition-colors hover:bg-blue-500/10"
		>
			{content}
		</Link>
	);
}
