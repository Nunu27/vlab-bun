import { Link } from "@tanstack/react-router";
import { Button } from "@web/components/ui/button";
import { format } from "date-fns";
import { FlaskConicalIcon } from "lucide-react";

type UpcomingLabItemProps = {
	lab: {
		id: string;
		name: string;
		cover: string | null;
		endAt: Date;
	};
};

export function UpcomingLabItem({ lab }: UpcomingLabItemProps) {
	return (
		<div className="flex items-center justify-between p-4 hover:bg-muted/50">
			<div className="flex items-center gap-4">
				{lab.cover ? (
					<img
						src={`/api/file/${lab.cover}`}
						alt={lab.name}
						className="h-10 w-10 rounded-md object-cover"
					/>
				) : (
					<div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
						<FlaskConicalIcon className="h-5 w-5" />
					</div>
				)}
				<div>
					<h4 className="font-medium text-sm">{lab.name}</h4>
					<p className="text-muted-foreground text-xs">
						Deadline: {format(lab.endAt, "PPP")}
					</p>
				</div>
			</div>
			<Button asChild size="sm" variant="secondary">
				<Link to="/lab/$labId" params={{ labId: lab.id }}>
					Check
				</Link>
			</Button>
		</div>
	);
}
