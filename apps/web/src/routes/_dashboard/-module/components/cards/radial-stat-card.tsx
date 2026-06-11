import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import { ChartContainer } from "@web/components/ui/chart";
import type { ReactNode } from "react";
import { PolarAngleAxis, PolarGrid, RadialBar, RadialBarChart } from "recharts";

interface RadialStatCardProps {
	title: string;
	value: ReactNode;
	description?: ReactNode;
	icon: ReactNode;
	progress: number;
	progressColorHex: string;
}

export function RadialStatCard({
	title,
	value,
	description,
	icon,
	progress,
	progressColorHex,
}: RadialStatCardProps) {
	const chartData = [
		{ name: "Usage", value: progress, fill: progressColorHex },
	];

	const chartConfig = {
		usage: {
			label: "Usage",
			color: progressColorHex,
		},
	};

	return (
		<Card className="flex flex-col border-border/50 bg-card">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="font-medium text-muted-foreground text-sm">
					{title}
				</CardTitle>
				<div className="text-muted-foreground">{icon}</div>
			</CardHeader>
			<CardContent className="flex flex-1 flex-row items-center justify-between pb-6">
				<div className="flex flex-col justify-center gap-1">
					<div className="font-bold text-3xl tracking-tight">{value}</div>
					{description && (
						<p className="text-muted-foreground text-xs">{description}</p>
					)}
				</div>
				<div className="h-[70px] w-[70px]">
					<ChartContainer
						config={chartConfig}
						className="mx-auto aspect-square h-full w-full"
					>
						<RadialBarChart
							data={chartData}
							cx="50%"
							cy="50%"
							startAngle={90}
							endAngle={-270}
							innerRadius={20}
							outerRadius={30}
							barSize={10}
						>
							<PolarGrid
								gridType="circle"
								radialLines={false}
								stroke="none"
								className="first:fill-muted last:fill-background"
								polarRadius={[30, 20]}
							/>
							<PolarAngleAxis
								type="number"
								domain={[0, 100]}
								angleAxisId={0}
								tick={false}
							/>
							<RadialBar dataKey="value" cornerRadius={10} />
						</RadialBarChart>
					</ChartContainer>
				</div>
			</CardContent>
		</Card>
	);
}
