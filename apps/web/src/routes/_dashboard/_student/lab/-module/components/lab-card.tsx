import { Link } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import { formatDateRange } from "@web/lib/utils";
import type { LabItem } from "@web/routes/_dashboard/_instructor/my-lab/-module/types";
import { CalendarIcon, FlaskConicalIcon, UserIcon } from "lucide-react";

type LabCardProps = {
	lab: Omit<LabItem, "createdAt" | "isPublished" | "index">;
};

export function LabCard({ lab }: LabCardProps) {
	return (
		<Link
			to="/lab/$labId"
			params={{ labId: lab.id }}
			className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
		>
			<Card className="flex h-full flex-col overflow-hidden pt-0 transition-all hover:bg-muted/50">
				<div className="aspect-video w-full shrink-0 overflow-hidden bg-muted">
					{lab.cover ? (
						<img
							src={`/api/file/${lab.cover}`}
							alt={lab.name}
							className="size-full object-cover transition-transform duration-300 hover:scale-105"
						/>
					) : (
						<div className="flex size-full items-center justify-center bg-secondary text-secondary-foreground">
							<FlaskConicalIcon />
						</div>
					)}
				</div>
				<CardHeader>
					<CardTitle className="line-clamp-2 font-bold text-lg leading-tight">
						{lab.name}
					</CardTitle>
				</CardHeader>
				<CardContent className="mt-auto flex justify-between">
					<div className="flex items-center gap-2">
						<UserIcon className="size-4" />
						<span className="truncate">{lab.instructor.name}</span>
					</div>
					<div className="flex items-center gap-2">
						<CalendarIcon className="size-4" />
						<span>{formatDateRange(lab.date.from, lab.date.to)}</span>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
