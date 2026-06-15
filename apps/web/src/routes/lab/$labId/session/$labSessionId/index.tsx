import type { ExtractTreatyData } from "@jawit/query/types";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	LabChecksSessionProvider,
	useLabChecksSessionStore,
} from "@web/components/mdx-plugins/lab-checks/stores/lab-checks-session-store";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@web/components/ui/resizable";
import { useWSEvent } from "@web/hooks/ws";
import api from "@web/lib/api";
import { queryClient } from "@web/lib/query";
import { socket } from "@web/lib/ws";
import { TopologyStoreProvider } from "@web/shared/topology/stores";
import { FileWarning } from "lucide-react";
import { useEffect, useMemo } from "react";
import SessionConflictModal from "./-module/components/modals/session-conflict-modal";
import SessionOverridenModal from "./-module/components/modals/session-overriden-modal";
import { SessionHeader } from "./-module/components/session-header";
import { SessionSidebar } from "./-module/components/session-sidebar";
import { SessionTopology } from "./-module/components/session-topology";
import {
	LabSessionModalProvider,
	useLabSessionModalStore,
} from "./-module/store/lab-session-modal-store";

type LabTopology = ExtractTreatyData<
	ReturnType<typeof api.lab>["get"]
>["topology"];

export const Route = createFileRoute("/lab/$labId/session/$labSessionId/")({
	component: RouteComponent,
	loader: async ({ params: { labId, labSessionId } }) => {
		await Promise.all([
			api.lab({ labId }).get.ensureQueryData(queryClient),
			api
				.lab({ labId })
				.session({ labSessionId })
				.get.ensureQueryData(queryClient),
			api["device-template"].list.get.ensureQueryData(queryClient),
			api.evaluator.list.get.ensureQueryData(queryClient),
		]);
	},
});

function RouteComponent() {
	const { labId, labSessionId } = Route.useParams();

	const { data: lab } = api.lab({ labId }).get.useSuspenseQuery();
	const { data: session } = api
		.lab({ labId })
		.session({ labSessionId })
		.get.useSuspenseQuery();
	const { data: categorizedTemplates } =
		api["device-template"].list.get.useSuspenseQuery();
	const { data: evaluator } = api.evaluator.list.get.useSuspenseQuery();

	const nodes = useMemo(() => {
		const map: Record<string, string> = {};

		Object.entries(lab.topology.devices).forEach(
			([id, device]: [string, LabTopology["devices"][string]]) => {
				map[id] = device.name;
			},
		);

		return map;
	}, [lab.topology.devices]);

	return (
		<LabChecksSessionProvider
			nodes={nodes}
			checkDefinitions={evaluator.checks}
			checks={lab.checks}
			values={session.checks}
		>
			<LabSessionModalProvider>
				<TopologyStoreProvider
					sessionId={labSessionId}
					categorizedTemplates={categorizedTemplates}
					topology={lab.topology}
					nodesData={session.nodes}
				>
					<div className="hidden h-dvh flex-col overflow-hidden md:flex">
						<SessionHeader
							labId={labId}
							sessionId={labSessionId}
							name={lab.name}
							dueDate={session.dueDate}
						/>

						{/* Main Content Area */}
						<SessionLayout
							instructions={lab.instructions}
							labId={labId}
							labSessionId={labSessionId}
						/>
					</div>

					<div className="flex h-dvh flex-col items-center justify-center p-6 text-center md:hidden">
						<div className="mb-4 rounded-full bg-muted p-4">
							<FileWarning className="h-8 w-8 text-muted-foreground" />
						</div>
						<h2 className="font-bold text-xl">Desktop Required</h2>
						<p className="mx-auto mt-2 max-w-sm text-muted-foreground text-sm">
							The lab topology diagram requires a larger viewport for
							interaction and rendering. Please access this session on a desktop
							or tablet device.
						</p>
					</div>
				</TopologyStoreProvider>
			</LabSessionModalProvider>
		</LabChecksSessionProvider>
	);
}

function SessionLayout({
	instructions,
	labId,
	labSessionId,
}: {
	instructions: string;
	labId: string;
	labSessionId: string;
}) {
	const navigate = useNavigate();
	const store = useLabChecksSessionStore();
	const modalStore = useLabSessionModalStore();

	const { set } = store.use.actions();
	const { sidebar, conflict, overridden } = modalStore.use.actions();
	const sidebarOpen = modalStore.use.sidebar((s) => s !== null);

	useEffect(() => {
		sidebar.open("open");
	}, [sidebar]);

	useWSEvent("lab-session:[sessionId]:client-change", {
		params: { sessionId: labSessionId },
		handler: (data) => {
			if (data === null) return;

			if (data === socket.id) conflict.close();
			else overridden.open("open");
		},
	});

	useWSEvent("lab-session:[sessionId]:ended", {
		params: { sessionId: labSessionId },
		handler: async () => {
			await navigate({ to: "/lab/$labId", params: { labId }, replace: true });
			api.lab({ labId }).invalidateQuery(queryClient);
		},
	});

	useWSEvent("lab-session:[sessionId]:checks", {
		params: { sessionId: labSessionId },
		handler: ({ id, completed }) => set(id, completed),
	});

	return (
		<>
			<div className="flex flex-1 overflow-hidden">
				<ResizablePanelGroup orientation="horizontal">
					<ResizablePanel
						defaultSize={`${sidebarOpen ? 75 : 100}%`}
						minSize="30%"
					>
						<main className="relative flex h-full w-full flex-col overflow-hidden bg-muted/5">
							<SessionTopology />
						</main>
					</ResizablePanel>

					{sidebarOpen && (
						<>
							<ResizableHandle />
							<ResizablePanel defaultSize="25%" minSize="25%" maxSize="50%">
								<SessionSidebar instructions={instructions} />
							</ResizablePanel>
						</>
					)}
				</ResizablePanelGroup>
			</div>

			<SessionConflictModal sessionId={labSessionId} />
			<SessionOverridenModal />
		</>
	);
}
