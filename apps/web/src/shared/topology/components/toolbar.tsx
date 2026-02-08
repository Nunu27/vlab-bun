import { Separator } from "@web/components/ui/separator";
import ConnectModeButton from "./buttons/connect-mode-button";
import DeleteButton from "./buttons/delete-button";
import GroupButton from "./buttons/group-button";
import TextModeButton from "./buttons/text-mode-button";
import UngroupButton from "./buttons/ungroup-button";

function Toolbar() {
	return (
		<div className="bg-card border-border/50 absolute top-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border p-1.5 shadow-xl backdrop-blur-sm">
			<ConnectModeButton />
			<Separator orientation="vertical" className="h-8!" />
			<GroupButton />
			<UngroupButton />
			<Separator orientation="vertical" className="h-8!" />
			<TextModeButton />
			<Separator orientation="vertical" className="h-8!" />
			<DeleteButton />
		</div>
	);
}

export default Toolbar;
