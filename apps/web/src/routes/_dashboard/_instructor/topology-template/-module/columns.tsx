import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { TopologyTemplateActionsCell } from "./components/topology-template-actions-cell";
import type { TopologyTemplateItem } from "./types";

export const topologyTemplateColumns: ColumnDef<TopologyTemplateItem>[] = [
	{
		accessorKey: "index",
		size: 60,
		enableHiding: false,
		enableSorting: false,
		meta: {
			label: "#",
			center: true,
		},
		cell: ({ row }) => (
			<span className="block w-full text-center font-medium">
				{row.original.index}
			</span>
		),
	},
	{
		accessorKey: "name",
		enableHiding: false,
		meta: {
			label: "Template Name",
			isGrow: true,
		},
		cell: ({ row }) => (
			<Link
				to="/topology-template/$templateId"
				params={{ templateId: row.original.id }}
				className="font-medium text-primary hover:text-blue-600 hover:underline"
			>
				{row.original.name}
			</Link>
		),
	},
	{
		accessorKey: "createdAt",
		enableSorting: true,
		meta: {
			label: "Created At",
		},
		cell: ({ row }) => (
			<span className="whitespace-nowrap">
				{new Date(row.original.createdAt).toLocaleDateString()}
			</span>
		),
	},
	{
		id: "actions",
		size: 60,
		enableSorting: false,
		enableHiding: false,
		cell: ({ row }) => <TopologyTemplateActionsCell template={row.original} />,
	},
];
