import type { LabInstruction, LabTopology } from "@vlab/shared/schemas";
import { Card, CardContent } from "@web/components/ui/card";
import api from "@web/lib/api";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

function InstructionNode({
	instruction,
	stepPrefix,
	topology,
}: {
	instruction: LabInstruction;
	stepPrefix: string;
	topology?: LabTopology | null;
}) {
	const [expanded, setExpanded] = useState(true);
	const { data: evaluatorData } = api.evaluator.list.get.useSuspenseQuery();

	return (
		<div className="space-y-4">
			<div className="rounded-md border bg-muted/20 p-0 text-sm">
				<button
					type="button"
					className="mt-0.5 flex w-full cursor-pointer items-start gap-2 px-3 py-2"
					onClick={() => setExpanded((v) => !v)}
				>
					<div className="flex min-w-12 shrink-0 items-center gap-2 text-muted-foreground">
						{expanded ? (
							<ChevronDownIcon className="size-4" />
						) : (
							<ChevronRightIcon className="size-4" />
						)}
						{stepPrefix}
					</div>
					<div className="flex-1 text-left">
						<span className="whitespace-pre-wrap text-muted-foreground text-sm">
							{instruction.text}
						</span>
					</div>
				</button>

				{expanded && instruction.checks && instruction.checks.length > 0 && (
					<div className="border-t px-3 py-3">
						<p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-widest">
							Evaluation Checks
						</p>
						<ul className="list-disc space-y-2 pl-5 text-muted-foreground text-sm">
							{instruction.checks.map((check) => {
								const deviceName =
									topology?.devices?.[check.nodeId]?.name || check.nodeId;
								const checkDefinition = evaluatorData.checks[check.checkId];
								const checkName = checkDefinition?.name || check.checkId;

								return (
									<li key={check.id}>
										<div className="flex flex-col gap-1">
											<div className="flex flex-wrap items-center gap-1.5">
												<span className="font-medium text-foreground">
													{deviceName}
												</span>
												<span className="text-muted-foreground">-</span>
												<span className="rounded bg-muted px-1.5 py-0.5 font-medium font-mono text-foreground text-xs">
													{checkName}
												</span>
												<span className="text-muted-foreground">-</span>
												<span>Weight: {check.weight}</span>
											</div>
											{check.params && Object.keys(check.params).length > 0 && (
												<div className="mt-1 flex flex-col gap-1 rounded-md border bg-muted/30 p-2 text-xs">
													{Object.entries(check.params).map(([key, value]) => {
														const paramSchema =
															checkDefinition?.params?.properties?.[key];
														const label = paramSchema?.title || key;

														return (
															<div
																key={key}
																className="grid grid-cols-[120px_1fr] gap-2"
															>
																<span className="font-medium text-muted-foreground">
																	{label}:
																</span>
																<span className="font-mono text-foreground">
																	{String(value)}
																</span>
															</div>
														);
													})}
												</div>
											)}
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				)}
			</div>
			{instruction.children && instruction.children.length > 0 && (
				<div className="ml-2 space-y-4 border-l-2 pl-6">
					{(instruction.children as LabInstruction[]).map((child, index) => (
						<InstructionNode
							key={child.id}
							instruction={child}
							stepPrefix={`${stepPrefix}.${index + 1}`}
							topology={topology}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export function InstructionsTab({
	instructions,
	topology,
}: {
	instructions: LabInstruction[];
	topology?: LabTopology | null;
}) {
	return (
		<Card>
			<CardContent>
				<div className="space-y-4">
					{instructions.map((instruction, index) => (
						<InstructionNode
							key={instruction.id}
							instruction={instruction}
							stepPrefix={`${index + 1}`}
							topology={topology}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
