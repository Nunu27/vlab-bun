import type { ColumnDef } from "@tanstack/react-table";
import { StudentActionsCell } from "./components/student-actions-cell";
import type { StudentItem } from "./types";

export const studentColumns: ColumnDef<StudentItem>[] = [
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
		accessorKey: "nrp",
		enableHiding: false,
		meta: {
			label: "NRP",
		},
	},
	{
		accessorKey: "name",
		enableHiding: false,
		// Joined from the `user` relation, not a native `students` column —
		// the pagination endpoint can't sort by it.
		enableSorting: false,
		meta: {
			label: "Name",
			isGrow: true,
		},
	},
	{
		accessorKey: "studyProgram.name",
		id: "studyProgram",
		enableHiding: false,
		enableSorting: false,
		meta: {
			label: "Study Program",
			isGrow: true,
		},
	},
	{
		accessorKey: "year",
		meta: {
			label: "Year",
			center: true,
		},
	},
	{
		accessorKey: "degreeLevel",
		meta: {
			label: "Degree",
			center: true,
		},
	},
	{
		id: "actions",
		size: 60,
		enableSorting: false,
		enableHiding: false,
		cell: ({ row }) => <StudentActionsCell student={row.original} />,
	},
];
