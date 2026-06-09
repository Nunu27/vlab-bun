import type { ExtractTreatyData } from "@jawit/query/types";
import { createFileRoute } from "@tanstack/react-router";
import type { DeviceKind } from "@vlab/shared/enums";
import { LabChecksEditorProvider } from "@web/components/mdx-plugins/lab-checks";
import { PageHeading } from "@web/components/sections/page-heading";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@web/components/ui/tabs";
import api from "@web/lib/api";
import { queryClient } from "@web/lib/query";
import { useMemo } from "react";
import DeleteLabButton from "../-module/components/buttons/delete-lab-button";
import EditLabButton from "../-module/components/buttons/edit-lab-button";
import { DeleteLabModal } from "../-module/components/modals/delete-lab-modal";
import { LabModalProvider } from "../-module/stores/lab-modal-store";
import EnrollmentsTab from "./-module/components/tabs/enrollments-tab";
import { InstructionsTab } from "./-module/components/tabs/instructions-tab";
import { OverviewTab } from "./-module/components/tabs/overview-tab";
import { TopologyTab } from "./-module/components/tabs/topology-tab";

type CategorizedTemplates = ExtractTreatyData<
	ReturnType<(typeof api)["device-template"]["list"]["get"]>
>;
type LabTopology = ExtractTreatyData<
	ReturnType<ReturnType<typeof api.lab>["get"]>
>["topology"];

export const Route = createFileRoute("/_dashboard/_instructor/my-lab/$labId/")({
	staticData: {
		breadcrumbs: [
			{ title: "My Lab", url: "/my-lab" },
			{ title: (data) => data.get("name") ?? "..." },
		],
	},
	loader: async ({ params: { labId }, context }) => {
		const [{ name }] = await Promise.all([
			api.lab({ labId }).get.ensureQueryData(queryClient),
			api["device-template"].list.get.ensureQueryData(queryClient),
			api.evaluator.list.get.ensureQueryData(queryClient),
		]);
		context.breadcrumbData.set("name", name);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { labId } = Route.useParams();
	const { data: lab } = api.lab({ labId }).get.useSuspenseQuery();

	const { data: categorizedTemplates } =
		api["device-template"].list.get.useSuspenseQuery();
	const { data: evaluator } = api.evaluator.list.get.useSuspenseQuery();

	const kindMap = useMemo(() => {
		const map: Record<string, DeviceKind> = {};

		categorizedTemplates.forEach((category: CategorizedTemplates[0]) => {
			category.templates.forEach(
				(template: CategorizedTemplates[0]["templates"][0]) => {
					map[template.id] = template.kind;
				},
			);
		});

		return map;
	}, [categorizedTemplates]);

	const nodes: { label: string; value: string }[] = [];
	const kindMapping: Record<string, DeviceKind> = {};

	Object.entries(lab.topology.devices).forEach(
		([id, device]: [string, LabTopology["devices"][string]]) => {
			nodes.push({ label: device.name, value: id });
			kindMapping[id] = kindMap[device.deviceId] || "linux";
		},
	);

	return (
		<LabChecksEditorProvider
			nodes={nodes}
			kindMapping={kindMapping}
			evaluator={evaluator}
			checks={lab.checks}
		>
			<LabModalProvider>
				<div className="space-y-4">
					<PageHeading
						title={lab.name}
						back={{ to: "/my-lab" }}
						actions={
							<div className="flex gap-2">
								<EditLabButton labId={labId} />
								<DeleteLabButton lab={lab} />
							</div>
						}
					/>

					<Tabs defaultValue="overview" className="space-y-4">
						<TabsList className="grid w-full grid-cols-4">
							<TabsTrigger value="overview">Overview</TabsTrigger>
							<TabsTrigger value="topology">Topology</TabsTrigger>
							<TabsTrigger value="instructions">Instructions</TabsTrigger>
							<TabsTrigger value="enrollments">Enrollments</TabsTrigger>
						</TabsList>

						<TabsContent value="overview">
							<OverviewTab lab={lab} />
						</TabsContent>

						<TabsContent value="topology">
							<TopologyTab topology={lab.topology} />
						</TabsContent>

						<TabsContent value="instructions">
							<InstructionsTab instructions={lab.instructions} />
						</TabsContent>

						<TabsContent value="enrollments">
							<EnrollmentsTab labId={labId} />
						</TabsContent>
					</Tabs>
				</div>

				<DeleteLabModal />
			</LabModalProvider>
		</LabChecksEditorProvider>
	);
}
