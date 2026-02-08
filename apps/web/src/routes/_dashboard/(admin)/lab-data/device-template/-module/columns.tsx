import type { ColumnDef } from "@tanstack/react-table";
import { DeviceTemplateActionsCell } from "./components/device-template-actions-cell";
import type { DeviceTemplateItem } from "./types";

export const deviceTemplateColumns: ColumnDef<DeviceTemplateItem>[] = [
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
		id: "category",
		accessorKey: "category.name",
		enableSorting: false,
		meta: {
			label: "Category",
			isGrow: true,
		},
	},
	{
		accessorKey: "kind",
		enableSorting: false,
		meta: {
			label: "Kind",
			center: true,
		},
	},
	{
		id: "actions",
		size: 60,
		enableSorting: false,
		enableHiding: false,
		cell: ({ row }) => (
			<DeviceTemplateActionsCell deviceTemplate={row.original} />
		),
	},
];
