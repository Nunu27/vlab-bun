import "@tanstack/react-table";

declare module "@tanstack/react-table" {
	interface ColumnMeta {
		label?: string;
		center?: boolean;
		isGrow?: boolean;
		widthPercentage?: number;
	}
}
