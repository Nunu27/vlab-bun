import { useLabChecksSessionStore } from "@web/components/mdx-plugins/lab-checks/stores/lab-checks-session-store";

export function ScoreIndicator() {
	const score = useLabChecksSessionStore().use.score();

	return (
		<div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 font-bold text-sm">
			<span className={score === 100 ? "text-green-500" : ""}>
				{Math.round(score)}%
			</span>
		</div>
	);
}
