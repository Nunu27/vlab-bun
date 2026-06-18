import { useQuery } from "@tanstack/react-query";
import type { TopologyTemplate } from "@vlab/shared/schemas/topology-template";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@web/components/ui/dialog";
import { Input } from "@web/components/ui/input";
import { ScrollArea } from "@web/components/ui/scroll-area";
import api from "@web/lib/api";
import { useTopologyStore } from "@web/shared/topology/stores";
import {
	CableIcon,
	CpuIcon,
	FolderIcon,
	NetworkIcon,
	SearchIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

export function ApplyTopologyTemplateModal() {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const store = useTopologyStore();
	const importTopology = store.use.actions().importTopology;

	const { data: templates } = useQuery({
		queryKey: ["topology-template", "list"],
		queryFn: async () => {
			const res = await api["topology-template"].pagination.post({
				page: 1,
				perPage: 100, // Load all templates for simple selection
			});
			if (res.error) throw res.error;
			return (res.data?.data?.items ?? []) as unknown as TopologyTemplate[];
		},
		enabled: isOpen,
	});

	const filteredTemplates = useMemo(() => {
		if (!templates) return [];
		if (!searchQuery.trim()) return templates;
		const query = searchQuery.toLowerCase();
		return templates.filter((t) => t.name.toLowerCase().includes(query));
	}, [templates, searchQuery]);

	const handleApply = async (template: TopologyTemplate) => {
		const { devices, onBeforeDelete } = store.getState();
		const deviceIds = Object.keys(devices);

		if (onBeforeDelete && deviceIds.length > 0) {
			const shouldProceed = await onBeforeDelete(deviceIds);
			if (!shouldProceed) return;
		}

		importTopology(template.topology);
		setIsOpen(false);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="absolute top-4 right-4 z-10 bg-background/80 shadow-sm backdrop-blur-sm"
				>
					<FolderIcon className="mr-2 h-4 w-4" />
					Apply Template
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>Apply Topology Template</DialogTitle>
					<DialogDescription>
						Select a template to overwrite your current topology. This action
						cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<div className="relative mt-2">
					<SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search templates by name..."
						className="pl-9"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				<ScrollArea className="mt-2 h-[50vh] pr-4">
					<div className="grid grid-cols-2 gap-4 pb-4">
						{filteredTemplates.map((template) => {
							const deviceCount = Object.keys(
								template.topology?.devices || {},
							).length;
							const edgeCount = Object.keys(
								template.topology?.edges || {},
							).length;

							return (
								<div
									key={template.id}
									className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-5 text-card-foreground shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md"
								>
									<div className="absolute -top-4 -right-4 rounded-full bg-primary/5 p-6 opacity-0 transition-all duration-500 group-hover:scale-110 group-hover:opacity-100">
										<NetworkIcon className="size-12 text-primary/20" />
									</div>
									<div className="z-10 mb-6">
										<h4 className="line-clamp-1 font-semibold text-lg tracking-tight">
											{template.name}
										</h4>
										<p className="mt-1 text-muted-foreground text-xs">
											Created{" "}
											{new Date(template.createdAt).toLocaleDateString()}
										</p>

										<div className="mt-4 flex flex-wrap gap-2">
											<Badge variant="secondary" className="font-medium">
												<CpuIcon className="mr-1.5 size-3" />
												{deviceCount} Device{deviceCount !== 1 ? "s" : ""}
											</Badge>
											<Badge variant="secondary" className="font-medium">
												<CableIcon className="mr-1.5 size-3" />
												{edgeCount} Connection{edgeCount !== 1 ? "s" : ""}
											</Badge>
										</div>
									</div>
									<Button
										className="z-10 w-full font-medium"
										onClick={() => handleApply(template)}
									>
										Apply Template
									</Button>
								</div>
							);
						})}
						{filteredTemplates.length === 0 && (
							<div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
								<NetworkIcon className="mb-4 size-10 text-muted-foreground/30" />
								<p className="font-medium text-lg">No templates found</p>
								<p className="mt-1 text-muted-foreground text-sm">
									{searchQuery
										? "Try adjusting your search query."
										: "You haven't created any topology templates yet."}
								</p>
							</div>
						)}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
