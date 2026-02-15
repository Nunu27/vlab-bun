import type { ColumnDef } from "@tanstack/react-table";
import { StudyProgramActionsCell } from "./components/study-program-actions-cell";
import type { StudyProgramItem } from "./types";

export const studyProgramColumns: ColumnDef<StudyProgramItem>[] = [
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
		id: "department",
		enableSorting: false,
		accessorKey: "department.name",
		meta: {
			label: "Department",
			isGrow: true,
		},
	},
	{
		id: "actions",
		size: 60,
		enableSorting: false,
		enableHiding: false,
		cell: ({ row }) => <StudyProgramActionsCell studyProgram={row.original} />,
	},
];
