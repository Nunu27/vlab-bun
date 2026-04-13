import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import { Badge } from "@web/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web/components/ui/tooltip";
import { cn } from "@web/lib/utils";
import { CircleCheckIcon, CircleIcon, ListCheckIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useLabChecksSessionStore } from "../stores/lab-checks-session-store";
import { useLabCheckValue } from "../utils";

export const labCheckViewerDescriptor: JsxComponentDescriptor = {
	name: "LabChecks",
	kind: "text",
	props: [{ name: "value", type: "string" }],
	hasChildren: false,
	Editor: ({ mdastNode }) => {
		const ids = useLabCheckValue(mdastNode);
		const store = useLabChecksSessionStore();
		const state = store(
			useShallow(({ checks }) => ids.map((id) => checks[id])),
		);

		const passed = state.filter((check) => check.completed).length;

		let badgeVariantClass =
			"border-primary/20 bg-primary/10 text-primary hover:bg-primary/20";
		if (state.length) {
			if (passed === state.length) {
				badgeVariantClass =
					"border-green-500/20 bg-green-500/10 text-green-600 hover:bg-green-500/20";
			} else if (passed === 0) {
				badgeVariantClass =
					"border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20";
			} else {
				badgeVariantClass =
					"border-yellow-500/20 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20";
			}
		}

		return (
			<TooltipProvider>
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<Badge
							variant="secondary"
							className={cn(
								"cursor-help gap-1 transition-colors",
								badgeVariantClass,
							)}
						>
							<ListCheckIcon className="size-3" />
							{passed}/{state.length}
						</Badge>
					</TooltipTrigger>
					{!!state.length && (
						<TooltipContent className="flex flex-col gap-1.5 p-3">
							<ul className="space-y-2">
								{state.map((check, i) => (
									<li
										key={i.toString()}
										className="flex items-center gap-2 text-xs"
									>
										{check.completed ? (
											<CircleCheckIcon className="size-3.5 text-green-500" />
										) : (
											<CircleIcon className="size-3.5 text-muted-foreground" />
										)}
										<span>{check.text}</span>
									</li>
								))}
							</ul>
						</TooltipContent>
					)}
				</Tooltip>
			</TooltipProvider>
		);
	},
};
