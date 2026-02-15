import {
	Link,
	type LinkComponentProps,
	type RegisteredRouter,
} from "@tanstack/react-router";
import { cn } from "@web/lib/utils";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "../ui/button";

interface PageHeadingProps<
	TRouter extends RegisteredRouter = RegisteredRouter,
	TFrom extends string = string,
	TTo extends string = string,
> {
	title: string;
	subtitle?: string;
	back?: LinkComponentProps<"a", TRouter, TFrom, TTo>;
	actions?: React.ReactNode;
	className?: string;
}

export function PageHeading<
	TRouter extends RegisteredRouter = RegisteredRouter,
	TFrom extends string = string,
	TTo extends string = string,
>({
	title,
	subtitle,
	back,
	actions,
	className,
}: PageHeadingProps<TRouter, TFrom, TTo>) {
	return (
		<div className={cn("flex items-center justify-between gap-4", className)}>
			<div className="flex items-center gap-4">
				{back && (
					<Button variant="outline" asChild>
						<Link {...back}>
							<ArrowLeftIcon />
						</Link>
					</Button>
				)}
				<div className="space-y-1">
					<h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
					{subtitle && (
						<p className="text-muted-foreground text-sm">{subtitle}</p>
					)}
				</div>
			</div>
			{actions && (
				<div className="flex shrink-0 items-center gap-2">{actions}</div>
			)}
		</div>
	);
}
