import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@web/components/ui/sidebar";
import { FlaskConicalIcon } from "lucide-react";

export function AppLogo() {
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton
					size="lg"
					className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
						<FlaskConicalIcon className="size-4" />
					</div>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-bold">vLab</span>
						<span className="text-sidebar-foreground/70 truncate text-xs font-normal">
							Virtual Laboratory
						</span>
					</div>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
