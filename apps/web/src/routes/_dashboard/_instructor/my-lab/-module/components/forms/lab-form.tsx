import { useStore } from "@tanstack/react-form";
import type { LabRequestSchema, LabTopology } from "@vlab/shared/schemas";
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
import api from "@web/lib/api";
import InterfaceSelectModal from "@web/shared/topology/components/modals/interface-select-modal";
import { useTopologyStore } from "@web/shared/topology/stores";
import { useEffect } from "react";
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
	"maxAttempt",
	"attachments",
];

function hasErrorsForPrefixes(
	fieldMeta: Record<string, { errors: unknown[] }>,
	prefixes: string[],
) {
	return Object.entries(fieldMeta).some(
		([key, meta]) =>
			prefixes.some(
				(p) => key === p || key.startsWith(`${p}.`) || key.startsWith(`${p}[`),
			) && meta.errors.length > 0,
	);
}

function TabErrorDot() {
	return (
		<span className="ml-1.5 inline-block size-1.5 rounded-full bg-destructive" />
	);
}

export const LabForm = withForm({
	defaultValues: {} as typeof LabRequestSchema.static,
	render: ({ form }) => {
		const store = useTopologyStore();
		const { load } = store.use.actions();

		void api.evaluator.list.get.useSuspenseQuery();
		const { data: categories } =
			api["device-template"].list.get.useSuspenseQuery();

		const updateTopology = useDebounceCallback(() => {
			const { deviceCounts, devices, groups, notes, edges } = store.getState();

			form.setFieldValue("topology", {
				deviceCounts,
				devices,
				groups,
				notes,
				edges,
			} as LabTopology);
		});

		useEffect(() => {
			return store.subscribe(() => {
				updateTopology();
			});
		}, [store.subscribe, updateTopology]);

		// biome-ignore lint/correctness/useExhaustiveDependencies: prevent infinite loop
		useEffect(() => {
			load({
				categorizedTemplates: categories,
				...form.getFieldValue("topology"),
			});
		}, [categories, load]);

		const hasBasicErrors = useStore(form.store, (state) =>
			hasErrorsForPrefixes(
				state.fieldMeta as Record<string, { errors: unknown[] }>,
				BASIC_FIELDS,
			),
		);

		const hasInstructionErrors = useStore(form.store, (state) =>
			hasErrorsForPrefixes(
				state.fieldMeta as Record<string, { errors: unknown[] }>,
				["instructions"],
			),
		);

		const hasTopologyErrors = useStore(form.store, (state) =>
			hasErrorsForPrefixes(
				state.fieldMeta as Record<string, { errors: unknown[] }>,
				["topology"],
			),
		);

		const revalidateForm = () => {
			if (!form.state.canSubmit) {
				form.validateSync("submit");
			}
		};

		return (
			<>
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
						<Card>
							<CardHeader className="border-b">
								<CardTitle>Instructions</CardTitle>
								<CardDescription>
									Define step-by-step instructions with evaluation checks for
									students
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<LabInstructionForm
									form={form}
									fields={{
										instructions: "instructions",
									}}
								/>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				<InterfaceSelectModal />
			</>
		);
	},
});
