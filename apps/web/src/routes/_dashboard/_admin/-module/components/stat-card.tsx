import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import { cn } from "@web/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
	title: string;
	value: ReactNode;
	description?: ReactNode;
	icon: ReactNode;
	trend?: ReactNode;
	highlight?: boolean;
}

export function StatCard({
	title,
	value,
	description,
	icon,
	trend,
	highlight = false,
}: StatCardProps) {
	return (
		<Card className={cn(highlight && "bg-primary/5 ring-primary/20")}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<CardTitle
					className={cn("font-medium text-sm", highlight && "text-primary")}
				>
					{title}
				</CardTitle>
				<div
					className={cn("text-muted-foreground", highlight && "text-primary")}
				>
					{icon}
				</div>
			</CardHeader>
			<CardContent>
				<div className="font-bold text-3xl tracking-tight">{value}</div>
				{(description || trend) && (
					<div className="mt-1 flex items-center justify-between pt-1">
						{description && (
							<p className="text-muted-foreground text-xs">{description}</p>
						)}
						{trend && (
							<p className="font-medium text-emerald-600 text-xs dark:text-emerald-500">
								{trend}
							</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
