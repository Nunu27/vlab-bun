import type { ColumnDef } from "@tanstack/react-table";
import { DeviceCategoryActionsCell } from "./components/device-category-actions-cell";
import type { DeviceCategoryItem } from "./types";

export const deviceCategoryColumns: ColumnDef<DeviceCategoryItem>[] = [
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
		accessorKey: "color",
		enableHiding: false,
		enableSorting: false,
		size: 150,
		meta: {
			label: "Color",
			center: true,
		},
		cell: ({ row }) => (
			<div className="flex items-center justify-center gap-2">
				<div
					className="h-4 w-4 rounded-full border shadow-sm"
					style={{ backgroundColor: row.original.color }}
				/>
				<span className="text-muted-foreground text-sm">
					{row.original.color}
				</span>
			</div>
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
		cell: ({ row }) => (
			<DeviceCategoryActionsCell deviceCategory={row.original} />
		),
	},
];
