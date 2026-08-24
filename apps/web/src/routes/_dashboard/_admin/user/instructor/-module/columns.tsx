import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { InstructorActionsCell } from "./components/instructor-actions-cell";
import type { InstructorItem } from "./types";

export const instructorColumns: ColumnDef<InstructorItem>[] = [
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
		accessorKey: "nip",
		meta: {
			label: "NIP",
		},
	},
	{
		accessorKey: "name",
		id: "name",
		enableHiding: false,
		// Joined from the `user` relation, not a native `instructors` column —
		// the pagination endpoint can't sort by it.
		enableSorting: false,
		meta: {
			label: "Name",
			isGrow: true,
		},
	},
	{
		accessorKey: "email",
		// Joined from the `user` relation, not a native `instructors` column —
		// the pagination endpoint can't sort by it.
		enableSorting: false,
		meta: {
			label: "Email",
			isGrow: true,
		},
	},
	{
		accessorKey: "updatedAt",
		cell: ({ row }) => {
			if (!row.original.updatedAt) return "-";
			return format(new Date(row.original.updatedAt), "dd MMM yyyy HH:mm");
		},
		meta: {
			label: "Updated At",
		},
	},
	{
		id: "actions",
		size: 60,
		enableSorting: false,
		enableHiding: false,
		cell: ({ row }) => <InstructorActionsCell instructor={row.original} />,
	},
];
