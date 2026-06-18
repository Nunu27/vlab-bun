import { useStore } from "@tanstack/react-form";
import type { LabRequest, LabTopology } from "@vlab/shared/schemas";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@web/components/ui/alert-dialog";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@web/components/ui/tabs";
import { withForm } from "@web/hooks/form/use-app-form";
import { useTopologyStore } from "@web/shared/topology/stores";
import { useCallback, useEffect, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { LabBasicInfoForm } from "./lab-basic-info-form";
import { LabInstructionForm } from "./lab-instruction-form";
import LabTopologyForm from "./lab-topology-form";

const BASIC_FIELDS = [
	"name",
	"content",
	"cover",
	"isPublished",
	"date",
	"sessionDuration",
	"maxAttempt",
	"attachments",
];

function hasErrorsForPrefixes<TKeys extends string>(
	fieldMeta: Partial<Record<TKeys, { errors: unknown[] }>>,
	prefixes: string[],
) {
	return Object.entries(fieldMeta).some(
		([key, meta]) =>
			prefixes.some(
				(p) => key === p || key.startsWith(`${p}.`) || key.startsWith(`${p}[`),
			) && (meta as { errors: unknown[] }).errors.length > 0,
	);
}

function TabErrorDot() {
	return (
		<span className="ml-1.5 inline-block size-1.5 rounded-full bg-destructive" />
	);
}

export const LabForm = withForm({
	defaultValues: {} as LabRequest,
	render: ({ form }) => {
		const store = useTopologyStore();

		const [deletePrompt, setDeletePrompt] = useState<{
			resolve: (value: boolean) => void;
			message: string;
		} | null>(null);

		const handleBeforeDelete = useCallback(
			(deviceIds: string[]) => {
				const checks = form.getFieldValue("checks") || {};
				let affectedChecksCount = 0;

				for (const check of Object.values(checks)) {
					if (deviceIds.includes(check.nodeId)) {
						affectedChecksCount++;
					}
				}

				if (affectedChecksCount > 0) {
					return new Promise<boolean>((resolve) => {
						setDeletePrompt({
							resolve,
							message: `This action will permanently delete ${affectedChecksCount} registered check(s) associated with the selected device(s). Are you sure you want to proceed?`,
						});
					});
				}
				return true;
			},
			[form],
		);

		useEffect(() => {
			store.setState({ onBeforeDelete: handleBeforeDelete });
		}, [store, handleBeforeDelete]);

		const updateTopology = useDebounceCallback(() => {
			const { deviceCounts, devices, groups, notes, edges } = store.getState();

			form.setFieldValue("topology", {
				deviceCounts,
				devices,
				groups,
				notes,
				edges,
			} as LabTopology);

			// Prune checks and instructions that reference missing devices
			const checks = form.getFieldValue("checks") || {};
			let instructions = form.getFieldValue("instructions") || "";

			let hasChanges = false;
			const newChecks: NonNullable<LabRequest["checks"]> = {};
			const removedCheckIds = new Set<string>();

			for (const [checkId, check] of Object.entries(checks)) {
				if (devices[check.nodeId]) {
					newChecks[checkId] = check;
				} else {
					hasChanges = true;
					removedCheckIds.add(checkId);
				}
			}

			if (hasChanges) {
				form.setFieldValue("checks", newChecks);

				// Fix instructions: remove invalid checkIds from <LabChecks value="..." />
				instructions = instructions.replace(
					/<LabChecks\s+[^>]*value=["']([^"']*)["'][^>]*\/>/g,
					(match, valueStr) => {
						const ids = valueStr.split(",");
						const validIds = ids.filter(
							(id: string) => !removedCheckIds.has(id.trim()),
						);

						if (validIds.length === 0) {
							return ""; // Remove the entire tag if no valid checks remain
						}

						return match.replace(
							new RegExp(`value=["']${valueStr}["']`),
							`value="${validIds.join(",")}"`,
						);
					},
				);

				form.setFieldValue("instructions", instructions);
			}
		});

		useEffect(() => {
			return store.subscribe(() => {
				updateTopology();
			});
		}, [store.subscribe, updateTopology]);

		const hasBasicErrors = useStore(form.store, (state) =>
			hasErrorsForPrefixes(state.fieldMeta, BASIC_FIELDS),
		);

		const hasInstructionErrors = useStore(form.store, (state) =>
			hasErrorsForPrefixes(state.fieldMeta, ["instructions", "checks"]),
		);

		const hasTopologyErrors = useStore(form.store, (state) =>
			hasErrorsForPrefixes(state.fieldMeta, ["topology"]),
		);

		const revalidateForm = () => {
			if (!form.state.canSubmit) {
				form.validateSync("submit");
			}
		};

		return (
			<>
				<AlertDialog
					open={!!deletePrompt}
					onOpenChange={(open) => {
						if (!open && deletePrompt) {
							deletePrompt.resolve(false);
							setDeletePrompt(null);
						}
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
							<AlertDialogDescription>
								{deletePrompt?.message}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									deletePrompt?.resolve(true);
									setDeletePrompt(null);
								}}
							>
								Continue
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<Tabs
					defaultValue="basic"
					className="space-y-4"
					onValueChange={revalidateForm}
				>
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="basic">
							Basic Information
							{hasBasicErrors && <TabErrorDot />}
						</TabsTrigger>
						<TabsTrigger value="topology">
							Topology
							{hasTopologyErrors && <TabErrorDot />}
						</TabsTrigger>
						<TabsTrigger value="instructions">
							Instructions
							{hasInstructionErrors && <TabErrorDot />}
						</TabsTrigger>
					</TabsList>

					{/* Basic Information Tab */}
					<TabsContent value="basic">
						<Card>
							<CardHeader className="border-b">
								<CardTitle>Basic Information</CardTitle>
								<CardDescription>
									Configure the lab name, schedule, description, and attachments
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<LabBasicInfoForm
									form={form}
									fields={{
										name: "name",
										content: "content",
										cover: "cover",
										isPublished: "isPublished",
										date: "date",
										sessionDuration: "sessionDuration",
										maxAttempt: "maxAttempt",
										attachments: "attachments",
									}}
								/>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Topology Tab */}
					<TabsContent value="topology">
						<LabTopologyForm />
					</TabsContent>

					{/* Instructions Tab */}
					<TabsContent value="instructions">
						<Card className="gap-0 pb-0">
							<CardHeader className="border-b">
								<CardTitle>Instructions</CardTitle>
								<CardDescription>
									Define step-by-step instructions with evaluation checks for
									students
								</CardDescription>
							</CardHeader>
							<CardContent className="p-0">
								<LabInstructionForm
									form={form}
									fields={{
										devices: "topology.devices",
										content: "instructions",
										checks: "checks",
									}}
								/>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</>
		);
	},
});
