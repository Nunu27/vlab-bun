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
					<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
						<FlaskConicalIcon className="size-4" />
					</div>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-bold">vLab</span>
						<span className="truncate font-normal text-sidebar-foreground/70 text-xs">
							Virtual Laboratory
						</span>
					</div>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
