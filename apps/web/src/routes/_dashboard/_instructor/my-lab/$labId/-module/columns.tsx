import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@web/components/ui/badge";
import { formatTimeAgo } from "@web/helper/date";
import type { LabEnrollmentItem } from "../../-module/types";

export const enrollmentColumns: ColumnDef<LabEnrollmentItem>[] = [
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
		enableSorting: false,
		meta: {
			label: "Name",
			isGrow: true,
		},
		cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
	},
	{
		accessorKey: "nrp",
		enableSorting: false,
		meta: {
			label: "NRP",
		},
		cell: ({ row }) => (
			<span className="text-muted-foreground">{row.original.nrp}</span>
		),
	},
	{
		id: "status",
		enableSorting: false,
		meta: {
			label: "Status",
			center: true,
		},
		cell: ({ row }) => {
			const { status } = row.original;
			if (status === "Not Started") {
				return <Badge variant="secondary">Not Started</Badge>;
			}
			if (status === "Submitted") {
				return <Badge variant="default">Submitted</Badge>;
			}
			return <Badge variant="outline">In Progress</Badge>;
		},
	},
	{
		id: "score",
		enableSorting: false,
		meta: {
			label: "Score",
			center: true,
		},
		cell: ({ row }) => {
			const { score } = row.original;
			if (!score) return <span className="text-muted-foreground">-</span>;
			return <span className="font-semibold">{score}</span>;
		},
	},
	{
		id: "lastUpdated",
		enableSorting: false,
		meta: {
			label: "Last Updated",
			center: true,
		},
		cell: ({ row }) => {
			const { lastUpdated, status } = row.original;
			if (status === "Not Started") {
				return <span className="text-muted-foreground">-</span>;
			}
			return (
				<span className="text-muted-foreground">
					{formatTimeAgo(new Date(lastUpdated))}
				</span>
			);
		},
	},
];
