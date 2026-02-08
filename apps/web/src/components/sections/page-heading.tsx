import { cn } from "@web/lib/utils";

interface PageHeadingProps {
	title: string;
	subtitle?: string;
	actions?: React.ReactNode;
	className?: string;
}

export function PageHeading({
	title,
	subtitle,
	actions,
	className,
}: PageHeadingProps) {
	return (
		<div className={cn("flex items-center justify-between gap-4", className)}>
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
				{subtitle && (
					<p className="text-muted-foreground text-sm">{subtitle}</p>
				)}
			</div>
			{actions && (
				<div className="flex shrink-0 items-center gap-2">{actions}</div>
			)}
		</div>
	);
}
