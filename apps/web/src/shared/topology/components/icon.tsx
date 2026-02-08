import { DynamicIcon } from "@web/components/dynamic-icon";
import { cn } from "@web/lib/utils";
import { SettingsIcon } from "lucide-react";

function Icon(props: { name: string; className?: string }) {
	const className = cn("size-6", props.className);

	return (
		<DynamicIcon
			name={props.name}
			className={className}
			fallback={<SettingsIcon className={cn(className, "opacity-50")} />}
		/>
	);
}

export default Icon;
