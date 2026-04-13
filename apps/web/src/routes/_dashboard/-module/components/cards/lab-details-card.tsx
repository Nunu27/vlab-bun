import { Badge } from "@web/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import { formatDateRange } from "@web/lib/utils";
import {
	CalendarIcon,
	ClockIcon,
	FileTextIcon,
	UserIcon,
	UsersIcon,
} from "lucide-react";

interface LabDetailsCardProps {
	date: { from: string | Date; to: string | Date };
	sessionDuration?: number;
	maxAttempt?: number | null;
	instructorName?: string;
	isPublished?: boolean;
	showStatus?: boolean;
}

export function LabDetailsCard({
	date,
	sessionDuration,
	maxAttempt,
	instructorName,
	isPublished,
	showStatus,
}: LabDetailsCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Details</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{instructorName && (
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2 text-muted-foreground text-sm">
							<UserIcon className="h-4 w-4" />
							<span>Instructor</span>
						</div>
						<div className="font-medium text-sm">{instructorName}</div>
					</div>
				)}

				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2 text-muted-foreground text-sm">
						<CalendarIcon className="h-4 w-4" />
						<span>Schedule</span>
					</div>
					<div className="font-medium text-sm">
						{formatDateRange(date.from, date.to)}
					</div>
				</div>

				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2 text-muted-foreground text-sm">
						<ClockIcon className="h-4 w-4" />
						<span>Duration</span>
					</div>
					<div className="font-medium text-sm">
						{sessionDuration ? `${sessionDuration} min` : "Unknown"}
					</div>
				</div>

				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2 text-muted-foreground text-sm">
						<FileTextIcon className="h-4 w-4" />
						<span>Max Attempts</span>
					</div>
					<div className="font-medium text-sm">
						{maxAttempt ? maxAttempt : "Unlimited"}
					</div>
				</div>

				{showStatus && (
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2 text-muted-foreground text-sm">
							<UsersIcon className="h-4 w-4" />
							<span>Status</span>
						</div>
						<div>
							{isPublished ? (
								<Badge variant="default">Published</Badge>
							) : (
								<Badge variant="secondary">Draft</Badge>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
