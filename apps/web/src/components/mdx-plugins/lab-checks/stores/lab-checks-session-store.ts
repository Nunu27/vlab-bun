import type { ExtractTreatyData } from "@jawit/query/types";
import { createScopedStore } from "@jawit/zustand-helper/react";
import type { Store } from "@jawit/zustand-helper/types";
import type { LabChecksMap } from "@vlab/shared/schemas";
import type api from "@web/lib/api";
import { toast } from "sonner";
import { create } from "zustand";
import { formatLabCheck } from "../utils";

interface LabChecksSessionActions {
	set: (id: string, value: boolean) => void;
}

interface LabChecksSessionState {
	score: number;
	checks: Record<
		string,
		{
			text: string;
			completed: boolean;
		}
	>;
}

type LabChecksSessionStore = Store<
	LabChecksSessionState,
	LabChecksSessionActions
>;

interface LabChecksSessionContext {
	nodes: Record<string, string>;
	checks: LabChecksMap;
	values: Record<string, boolean>;
	checkDefinitions: ExtractTreatyData<typeof api.evaluator.list.get>["checks"];
}

const { Provider, useContext } = createScopedStore(
	({ nodes, checks, values, checkDefinitions }: LabChecksSessionContext) => {
		let score = 0;

		const checksData: LabChecksSessionState["checks"] = {};
		const scoreMapping: Record<string, number> = {};
		const totalWeight = Object.values(checks).reduce(
			(acc, check) => acc + check.weight,
			0,
		);

		Object.entries(checks).forEach(([id, check]) => {
			if (totalWeight > 0) {
				scoreMapping[id] = (check.weight / totalWeight) * 100;
			} else {
				scoreMapping[id] = 0;
			}

			const checkDef = checkDefinitions[check.checkId];
			const node = nodes[check.nodeId] || "Unknown Node";

			checksData[id] = {
				text: `${node}, ${formatLabCheck(checkDef?.params.title ?? "No info", check.params)}`,
				completed: values[id] ?? false,
			};
		});

		Object.entries(values).forEach(([id, passed]) => {
			if (!passed) return;
			score += scoreMapping[id];
		});

		return create<LabChecksSessionStore>()((set, get) => ({
			score,
			checks: checksData,
			actions: {
				set: (id, value) => {
					const { score, checks } = get();
					const check = checks[id];
					const checkScore = scoreMapping[id];

					if (!check || !checkScore) return;
					if (value === check.completed) return;

					if (value) {
						toast.success(`Check passed: ${check.text}`);
					} else {
						toast.error(`Check failed: ${check.text}`);
					}

					return set({
						score: score + (value ? checkScore : -checkScore),
						checks: { ...checks, [id]: { ...checks[id], completed: value } },
					});
				},
			},
		}));
	},
);

export const LabChecksSessionProvider = Provider;
export const useLabChecksSessionStore = useContext;
