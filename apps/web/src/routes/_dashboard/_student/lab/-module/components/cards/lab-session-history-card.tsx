import type { ExtractTreatyData } from "@jawit/query/types";
import { Link } from "@tanstack/react-router";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@web/components/ui/empty";
import type api from "@web/lib/api";
import { ClockIcon, PlayCircleIcon } from "lucide-react";
import { StartLabSessionButton } from "../buttons/start-lab-session-button";
import { LabSessionHistoryItem } from "./lab-session-history-item";

interface LabSessionHistoryCardProps {
	maxAttempt?: number | null;
	sessions: ExtractTreatyData<ReturnType<typeof api.lab>["session"]["get"]>;
	labId: string;
	date: { from: Date | string; to: Date | string };
	isPublished?: boolean;
}

export function LabSessionHistoryCard({
	maxAttempt,
	sessions,
	labId,
	date,
	isPublished,
}: LabSessionHistoryCardProps) {
	const attemptCount = sessions.length;
	const isUnlimited = !maxAttempt;
	const activeSession = sessions.find(
		(s: LabSessionHistoryCardProps["sessions"][0]) => !s.submittedAt,
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<CardTitle>Session History</CardTitle>
				<div className="flex items-center gap-3">
					<Badge
						variant={
							isUnlimited || attemptCount < maxAttempt
								? "secondary"
								: "destructive"
						}
					>
						{attemptCount} / {isUnlimited ? "Unlimited" : maxAttempt} Attempts
					</Badge>
					{activeSession ? (
						<Button asChild className="gap-2">
							<Link
								to="/lab/$labId/session/$labSessionId"
								params={{ labId, labSessionId: activeSession.id }}
							>
								<PlayCircleIcon className="h-4 w-4" />
								Resume Session
							</Link>
						</Button>
					) : (
						<StartLabSessionButton
							labId={labId}
							maxAttempt={maxAttempt || null}
							attemptCount={attemptCount}
							date={date}
							isPublished={isPublished}
						/>
					)}
				</div>
			</CardHeader>
			<CardContent>
				{sessions.length === 0 ? (
					<Empty className="border-0 p-6">
						<EmptyContent>
							<EmptyMedia variant="icon">
								<ClockIcon />
							</EmptyMedia>
							<EmptyTitle>No Sessions Started</EmptyTitle>
							<EmptyDescription>No sessions started yet.</EmptyDescription>
						</EmptyContent>
					</Empty>
				) : (
					<div className="space-y-4">
						{sessions.map(
							(session: LabSessionHistoryCardProps["sessions"][0]) => {
								return (
									<LabSessionHistoryItem
										key={session.id}
										session={session}
										labId={labId}
									/>
								);
							},
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
