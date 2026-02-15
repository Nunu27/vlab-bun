import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { AdminActionsCell } from "./components/admin-actions-cell";
import type { AdminItem } from "./types";

export const adminColumns: ColumnDef<AdminItem>[] = [
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
		id: "name",
		enableHiding: false,
		meta: {
			label: "Admin Name",
			isGrow: true,
		},
	},
	{
		accessorKey: "email",
		meta: {
			label: "Email",
			isGrow: true,
		},
	},
	{
		accessorKey: "createdAt",
		cell: ({ row }) => {
			if (!row.original.createdAt) return "-";
			return format(new Date(row.original.createdAt), "dd MMM yyyy HH:mm");
		},
		meta: {
			label: "Created At",
		},
	},
	{
		id: "actions",
		size: 60,
		enableSorting: false,
		enableHiding: false,
		cell: ({ row }) => <AdminActionsCell admin={row.original} />,
	},
];
