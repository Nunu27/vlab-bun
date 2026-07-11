import api from "@web/lib/api";
import Icon from "./icon";

function DevicePalette() {
	const { data: categories } =
		api["device-template"].list.get.useSuspenseQuery();

	return (
		<div
			data-tour="device-palette"
			className="z-10 flex w-64 flex-col border-gray-200 border-r bg-gray-50 shadow-lg dark:border-border dark:bg-background"
		>
			<div className="border-gray-200 border-b bg-white p-4 dark:border-border dark:bg-card">
				<h2 className="font-semibold text-gray-500 text-xs uppercase tracking-wider dark:text-muted-foreground">
					Device Palette
				</h2>
			</div>
			<div className="flex-1 space-y-6 overflow-y-auto p-4">
				{categories?.map((category) => (
					<div key={category.id}>
						<h3
							className="mb-3 ml-1 font-bold text-gray-400 text-xs uppercase dark:text-muted-foreground"
							style={{ color: category.color }}
						>
							{category.name}
						</h3>
						{category.templates.map((template) => (
							<div
								key={template.id}
								draggable
								onDragStart={(e) => {
									e.dataTransfer.setData("deviceId", template.id);
									e.dataTransfer.effectAllowed = "copy";
								}}
								className="group mb-2 flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-indigo-200 hover:bg-gray-50 dark:border-border dark:bg-card dark:hover:border-primary/50 dark:hover:bg-accent"
							>
								<div className="rounded-md bg-gray-100 p-2 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-muted dark:group-hover:bg-primary/20 dark:group-hover:text-primary">
									<Icon name={template.icon} />
								</div>
								<span className="font-medium text-gray-700 text-sm dark:text-foreground">
									{template.name}
								</span>
							</div>
						))}
					</div>
				))}
			</div>
		</div>
	);
}

export default DevicePalette;
