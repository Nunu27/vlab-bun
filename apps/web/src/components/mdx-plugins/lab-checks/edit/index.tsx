import {
	type JsxComponentDescriptor,
	useLexicalNodeRemove,
	useMdastNodeUpdater,
} from "@mdxeditor/editor";
import type { LabRequest } from "@vlab/shared/schemas";
import { Badge } from "@web/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web/components/ui/tooltip";
import { useTypedAppFormContext } from "@web/hooks/form/use-app-form";
import { ListCheckIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { useLabChecksEditorStore } from "../stores/lab-checks-editor-store";
import { useLabChecksModalStore } from "../stores/lab-checks-modal-store";
import { formatLabCheck, useLabCheckValue } from "../utils";

export * from "./insert-lab-check";
export * from "./lab-check-form";
export * from "./lab-check-modal";

export const labCheckEditorDescriptor: JsxComponentDescriptor = {
	name: "LabChecks",
	kind: "text",
	props: [{ name: "value", type: "string" }],
	hasChildren: false,
	Editor: ({ mdastNode }) => {
		const store = useLabChecksModalStore();
		const form = useTypedAppFormContext<
			LabRequest,
			never,
			never,
			never,
			never,
			never,
			never,
			never,
			never,
			never,
			never,
			never
		>({});
		const updateMdastNode = useMdastNodeUpdater();
		const removeSelf = useLexicalNodeRemove();
		const isOpen = store.use.configure((value) => !!value);
		const open = store.use.actions((actions) => actions.configure.open);

		const ids = useLabCheckValue(mdastNode);

		const contextRef = useRef({
			mdastNode,
			updateMdastNode,
			form,
			ids,
		});
		contextRef.current = { mdastNode, updateMdastNode, form, ids };

		const updateValue = useCallback(
			(value: string[]) => {
				const state = store.getState().configure;

				const { mdastNode, updateMdastNode } = contextRef.current;
				const attributes = mdastNode.attributes.filter(
					(attr) => !(attr.type === "mdxJsxAttribute" && attr.name === "value"),
				);

				attributes.push({
					type: "mdxJsxAttribute",
					name: "value",
					value: value.join(","),
				});

				updateMdastNode({ attributes });
				if (state) open({ ...state, ids: value });
			},
			[store, open],
		);

		const addCheck = useCallback(() => {
			const { form, ids } = contextRef.current;
			const id = crypto.randomUUID();

			form.setFieldValue(`checks.${id}`, {
				nodeId: "",
				checkId: "",
				params: {},
				weight: 1,
			});

			updateValue([...ids, id]);
		}, [updateValue]);

		const removeCheck = useCallback(
			(id: string) => {
				const { form, ids } = contextRef.current;
				updateValue(ids.filter((i) => i !== id));

				const checks = { ...form.state.values.checks };
				delete checks[id];

				form.setFieldValue("checks", checks);
			},
			[updateValue],
		);

		// biome-ignore lint/correctness/useExhaustiveDependencies: first time only
		useEffect(() => {
			if (isOpen || ids.length) return;
			open({ ids, addCheck, removeCheck, removeSelf });
		}, []);

		return (
			<Badge
				className="cursor-pointer"
				onClick={() => open({ ids, addCheck, removeCheck, removeSelf })}
			>
				<ListCheckIcon className="size-3" />
				{ids.length} Check{ids.length === 1 ? "" : "s"}
			</Badge>
		);
	},
};

export const labCheckReadonlyEditorDescriptor: JsxComponentDescriptor = {
	name: "LabChecks",
	kind: "text",
	props: [{ name: "value", type: "string" }],
	hasChildren: false,
	Editor: ({ mdastNode }) => {
		const ids = useLabCheckValue(mdastNode);
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

				const value: string[] = [];

				ids.forEach((id) => {
					const config = checks[id];
					const check = evaluator.checks[config.checkId];
					const node = nodeMap[config.nodeId];

					value.push(
						`${node}, ${formatLabCheck(check.params.title ?? "No info", config.params)}`,
					);
				});

				return value;
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
	},
};
