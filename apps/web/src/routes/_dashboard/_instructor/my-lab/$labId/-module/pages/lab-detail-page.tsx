import { Link } from "@tanstack/react-router";
import { ActionButton } from "@web/components/buttons/action-button";
import { DataTable } from "@web/components/data-table";
import { PageHeading } from "@web/components/sections/page-heading";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@web/components/ui/tabs";
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";
import api from "@web/lib/api";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useLabModalStore } from "../../../-module/stores/lab-modal-store";
import { enrollmentColumns } from "../columns";
import { InstructionsTab } from "../components/instructions-tab";
import { OverviewTab } from "../components/overview-tab";
import { TopologyTab } from "../components/topology-tab";

function LabDetailPage({ labId }: { labId: string }) {
	const { data: lab } = api.lab({ labId }).get.useSuspenseQuery();
	const pagination = useApiPagination(api.lab({ labId }).enrollment.pagination);
	const actions = useLabModalStore().use.actions();

	return (
		<div className="space-y-4">
			<PageHeading
				title={lab.name}
				back={{ to: "/my-lab" }}
				actions={
					<div className="flex gap-2">
						<ActionButton icon={PencilIcon} tooltip="Edit" asChild>
							<Link to="/my-lab/$labId/edit" params={{ labId }}>
								<PencilIcon className="size-4" />
								<span className="sr-only">Edit</span>
							</Link>
						</ActionButton>
						<ActionButton
							icon={Trash2Icon}
							tooltip="Delete"
							variant="destructive"
							onClick={() => actions.delete.open(lab)}
						/>
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
					<InstructionsTab
						instructions={lab.instructions}
						topology={lab.topology}
					/>
				</TabsContent>

				<TabsContent value="enrollments">
					<DataTable pagination={pagination} columns={enrollmentColumns} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

export default LabDetailPage;
