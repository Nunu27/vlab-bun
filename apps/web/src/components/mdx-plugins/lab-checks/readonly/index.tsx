import { Badge } from "@web/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web/components/ui/tooltip";
import { ListCheckIcon } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { useLabChecksEditorStore } from "../stores/lab-checks-editor-store";
import { formatLabCheck, parseLabCheckIds } from "../utils";

export function LabChecksReadonlyBadge({ value }: { value?: string }) {
	const ids = useMemo(() => parseLabCheckIds(value), [value]);
	const store = useLabChecksEditorStore();

	const checks = store(
		useShallow(({ nodes, evaluator, checks }) => {
			if (!checks) return [];

			const nodeMap = nodes.reduce(
				(acc, node) => {
					acc[node.value] = node.label;
					return acc;
				},
				{} as Record<string, string>,
			);

			const result: string[] = [];

			ids.forEach((id) => {
				const config = checks[id];
				const check = evaluator.checks[config.checkId];
				const node = nodeMap[config.nodeId];

				result.push(
					`${node}, ${formatLabCheck(check.params.title ?? "No info", config.params)}`,
				);
			});

			return result;
		}),
	);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge>
						<ListCheckIcon className="size-3" />
						{ids.length} Check{ids.length === 1 ? "" : "s"}
					</Badge>
				</TooltipTrigger>
				{checks.length > 0 && (
					<TooltipContent className="flex-col items-start gap-1 pl-6">
						<ul className="list-disc">
							{checks.map((check, i) => (
								<li key={i.toString()} className="text-xs">
									{check}
								</li>
							))}
						</ul>
					</TooltipContent>
				)}
			</Tooltip>
		</TooltipProvider>
	);
}
