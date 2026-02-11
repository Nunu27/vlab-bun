import { Link, useRouterState } from "@tanstack/react-router";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@web/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@web/components/ui/sidebar";
import type { MenuSection } from "@web/constants/menu";
import { ChevronRight } from "lucide-react";

export function NavMain({ sections }: { sections: MenuSection[] }) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	return (
		<>
			{sections.map((section, index) => (
				<SidebarGroup key={section.title ?? `section-${index}`}>
					{section.title && (
						<SidebarGroupLabel className="font-bold text-sidebar-foreground/70 text-xs uppercase tracking-wider">
							{section.title}
						</SidebarGroupLabel>
					)}
					<SidebarMenu>
						{section.items.map((item) => {
							let isChildActive = false;
							const haveSubMenu = "items" in item;
							const subMenu = (haveSubMenu ? item.items : [])?.map(
								(subItem) => {
									const isActive = subItem.url === pathname;
									if (!isChildActive && isActive) isChildActive = true;

									return (
										<SidebarMenuSubItem key={subItem.title}>
											<SidebarMenuSubButton asChild>
												<Link
													to={subItem.url}
													activeProps={{
														className:
															"bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
													}}
												>
													{subItem.title}
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									);
								},
							);

							return haveSubMenu ? (
								<Collapsible
									key={item.title}
									asChild
									defaultOpen={isChildActive}
									className="group/collapsible"
								>
									<SidebarMenuItem>
										<CollapsibleTrigger asChild>
											<SidebarMenuButton tooltip={item.title}>
												{item.icon && <item.icon />}
												{item.title}
												<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
											</SidebarMenuButton>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub>{subMenu}</SidebarMenuSub>
										</CollapsibleContent>
									</SidebarMenuItem>
								</Collapsible>
							) : (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton tooltip={item.title} asChild>
										<Link
											to={item.url}
											activeProps={{
												className:
													"bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
											}}
										>
											{item.icon && <item.icon />}
											{item.title}
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							);
						})}
					</SidebarMenu>
				</SidebarGroup>
			))}
		</>
	);
}
