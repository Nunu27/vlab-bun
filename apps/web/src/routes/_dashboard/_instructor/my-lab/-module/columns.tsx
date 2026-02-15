import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@web/components/ui/badge";
import { formatDateRange } from "@web/lib/utils";
import { LabActionsCell } from "./components/lab-actions-cell";
import type { LabItem } from "./types";

export const labColumns: ColumnDef<LabItem>[] = [
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
			label: "Name",
			isGrow: true,
		},
		cell: ({ row }) => (
			<Link
				to="/my-lab/$labId"
				params={{ labId: row.original.id }}
				className="font-medium text-primary hover:text-blue-600 hover:underline"
			>
				{row.original.name}
			</Link>
		),
	},
	{
		id: "schedule",
		accessorKey: "date",
		enableSorting: false,
		meta: {
			label: "Schedule",
			isGrow: true,
		},
		cell: ({ row }) => {
			const { from, to } = row.original.date;
			return (
				<span className="whitespace-nowrap">{formatDateRange(from, to)}</span>
			);
		},
	},
	{
		accessorKey: "isPublished",
		enableSorting: false,
		meta: {
			label: "Status",
		},
		cell: ({ row }) => (
			<Badge variant={row.original.isPublished ? "default" : "secondary"}>
				{row.original.isPublished ? "Published" : "Draft"}
			</Badge>
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
		cell: ({ row }) => <LabActionsCell lab={row.original} />,
	},
];
