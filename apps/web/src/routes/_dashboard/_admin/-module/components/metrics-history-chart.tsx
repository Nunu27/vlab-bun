import { Button } from "@web/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
} from "@web/components/ui/chart";
import { useState } from "react";
import {
	CartesianGrid,
	ComposedChart,
	Line,
	ReferenceArea,
	XAxis,
	YAxis,
} from "recharts";
import {
	type MetricsDataPoint,
	useMetricsHistoryStore,
} from "../stores/metrics-history-store";

const chartConfig: ChartConfig = {
	cpuUsagePercent: { label: "CPU", color: "var(--color-blue-400)" },
	memoryUsagePercent: { label: "Memory", color: "var(--color-emerald-400)" },
	storageUsagePercent: { label: "Storage", color: "var(--color-yellow-400)" },
};

const SERIES = [
	{
		key: "cpuUsagePercent" as const,
		label: "CPU",
		color: "var(--color-cpuUsagePercent)",
		actual: (p: MetricsDataPoint) =>
			`${p.usedCpuCores.toFixed(1)} / ${p.totalCpuCores} Cores`,
	},
	{
		key: "memoryUsagePercent" as const,
		label: "Memory",
		color: "var(--color-memoryUsagePercent)",
		actual: (p: MetricsDataPoint) =>
			`${formatMemory(p.usedMemoryMB)} / ${formatMemory(p.totalMemoryMB)}`,
	},
	{
		key: "storageUsagePercent" as const,
		label: "Storage",
		color: "var(--color-storageUsagePercent)",
		actual: (p: MetricsDataPoint) =>
			`${formatMemory(p.usedStorageMB)} / ${formatMemory(p.totalStorageMB)}`,
	},
] as const;

function formatTime(ts: number) {
	return new Date(ts).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

function formatMemory(mb: number) {
	if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
	return `${Math.round(mb)} MB`;
}

// ---------------------------------------------------------------------------
// Custom tooltip — full layout control, no ChartTooltipContent wrapper
// ---------------------------------------------------------------------------
function MetricsTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: { payload: MetricsDataPoint }[];
}) {
	if (!active || !payload?.length) return null;
	const point = payload[0]?.payload as MetricsDataPoint | undefined;
	if (!point) return null;

	return (
		<div className="min-w-56 rounded-lg border border-border/50 bg-background p-3 shadow-xl">
			{/* Timestamp header */}
			<p className="mb-2 border-border/50 border-b pb-2 font-medium text-foreground text-xs">
				{formatTime(point.timestamp)}
			</p>

			{/* Metric rows */}
			<div className="grid gap-1.5">
				{SERIES.map(({ key, label, color, actual }) => (
					<div
						key={key}
						className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2"
					>
						{/* Colour dot + label */}
						<div
							className="h-2 w-2 shrink-0 rounded-sm"
							style={{ backgroundColor: color }}
						/>
						<span className="text-muted-foreground text-xs">{label}</span>

						{/* Values — right-aligned */}
						<div className="flex flex-col items-end">
							<span className="font-medium font-mono text-foreground text-xs tabular-nums">
								{point[key].toFixed(1)}%
							</span>
							<span className="text-muted-foreground text-xs">
								{actual(point)}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main chart component
// ---------------------------------------------------------------------------
type ZoomDomain = { left: number; right: number } | null;
type Selecting = { left: number | null; right: number | null };

export function MetricsHistoryChart() {
	const history = useMetricsHistoryStore((s) => s.history);

	const [zoomDomain, setZoomDomain] = useState<ZoomDomain>(null);
	const [selecting, setSelecting] = useState<Selecting>({
		left: null,
		right: null,
	});

	const displayedData: MetricsDataPoint[] =
		zoomDomain !== null
			? history.filter(
					(p) =>
						p.timestamp >= (zoomDomain as NonNullable<ZoomDomain>).left &&
						p.timestamp <= (zoomDomain as NonNullable<ZoomDomain>).right,
				)
			: history;

	function handleMouseDown(e: { activeLabel?: number | string } | null) {
		const ts = Number(e?.activeLabel);
		if (!ts) return;
		setSelecting({ left: ts, right: null });
	}

	function handleMouseMove(e: { activeLabel?: number | string } | null) {
		if (selecting.left === null) return;
		const ts = Number(e?.activeLabel);
		if (!ts) return;
		setSelecting((s) => ({ ...s, right: ts }));
	}

	function handleMouseUp() {
		if (selecting.left !== null && selecting.right !== null) {
			const left = Math.min(selecting.left, selecting.right);
			const right = Math.max(selecting.left, selecting.right);
			if (right - left > 0) {
				setZoomDomain({ left, right });
			}
		}
		setSelecting({ left: null, right: null });
	}

	function handleResetZoom() {
		setZoomDomain(null);
		setSelecting({ left: null, right: null });
	}

	return (
		<Card className="border-border/50 bg-card">
			<CardHeader className="flex flex-row items-start justify-between">
				<div className="flex flex-col gap-1">
					<CardTitle>Resource Usage Over Time</CardTitle>
					<CardDescription>
						Drag on the chart to zoom into a time window. History is kept for up
						to 2 hours.
					</CardDescription>
				</div>
				{zoomDomain !== null && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleResetZoom}
						className="shrink-0"
					>
						Reset Zoom
					</Button>
				)}
			</CardHeader>
			<CardContent>
				{history.length === 0 ? (
					<p className="py-16 text-center text-muted-foreground text-sm">
						Waiting for data…
					</p>
				) : (
					<ChartContainer
						config={chartConfig}
						className="h-70 w-full"
						initialDimension={{ width: 800, height: 280 }}
					>
						<ComposedChart
							data={displayedData}
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							style={{ userSelect: "none" }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="var(--border)"
								opacity={0.5}
							/>
							<XAxis
								dataKey="timestamp"
								type="number"
								scale="time"
								domain={["dataMin", "dataMax"]}
								tickFormatter={formatTime}
								tick={{ fontSize: 11 }}
								tickLine={false}
								axisLine={false}
								minTickGap={60}
							/>
							<YAxis
								domain={[0, 100]}
								tickFormatter={(v) => `${v}%`}
								tick={{ fontSize: 11 }}
								tickLine={false}
								axisLine={false}
								width={40}
							/>
							<ChartTooltip
								content={<MetricsTooltip />}
								cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
							/>
							<ChartLegend content={<ChartLegendContent />} />
							{SERIES.map(({ key, color }) => (
								<Line
									key={key}
									dataKey={key}
									stroke={color}
									dot={false}
									strokeWidth={1.5}
									isAnimationActive={false}
								/>
							))}
							{selecting.left !== null && selecting.right !== null && (
								<ReferenceArea
									x1={Math.min(selecting.left, selecting.right)}
									x2={Math.max(selecting.left, selecting.right)}
									strokeOpacity={0.3}
									fill="var(--color-muted)"
									fillOpacity={0.3}
								/>
							)}
						</ComposedChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
