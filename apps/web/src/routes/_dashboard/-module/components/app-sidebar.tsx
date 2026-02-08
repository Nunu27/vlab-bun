import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarRail,
} from "@web/components/ui/sidebar";
import { menuByRole } from "@web/constants/menu";
import { useAuthStore } from "@web/stores/auth-store";
import { AppLogo } from "./app-logo";
import { NavMain } from "./nav-main";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const role = useAuthStore.use.user((user) => user?.role ?? "student");

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<AppLogo />
			</SidebarHeader>
			<SidebarContent>
				<NavMain sections={menuByRole[role]} />
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}
