import type { ColumnDef } from "@tanstack/react-table";
import { DepartmentActionsCell } from "./components/department-actions-cell";
import type { DepartmentItem } from "./types";

export const departmentColumns: ColumnDef<DepartmentItem>[] = [
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
	},
	{
		id: "actions",
		size: 60,
		enableSorting: false,
		enableHiding: false,
		cell: ({ row }) => <DepartmentActionsCell department={row.original} />,
	},
];
