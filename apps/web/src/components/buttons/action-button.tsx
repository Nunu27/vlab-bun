import { Button } from "@web/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@web/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

interface ActionButtonProps
	extends Omit<ComponentProps<typeof Button>, "size"> {
	icon: LucideIcon;
	tooltip: string;
	children?: ReactNode;
}

export function ActionButton({
	icon: Icon,
	tooltip,
	variant = "secondary",
	className = "transition-none",
	asChild,
	children,
	type = "button",
	...props
}: ActionButtonProps) {
	return (
		<Tooltip delayDuration={250}>
			<TooltipTrigger asChild>
				<Button
					variant={variant}
					size="icon"
					className={className}
					asChild={asChild}
					type={type}
					{...props}
				>
					{asChild ? (
						children
					) : (
						<>
							<Icon className="size-4" />
							<span className="sr-only">{tooltip}</span>
						</>
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
