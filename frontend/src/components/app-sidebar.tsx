'use client';

import { AppLogo } from '@frontend/components/app-logo';
import { NavMain } from '@frontend/components/nav-main';
import { NavUser } from '@frontend/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@frontend/components/ui/sidebar';
import { menuByRole } from '@frontend/constants/menu';
import { useRouteContext } from '@tanstack/react-router';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const userRole = useRouteContext({
    from: '__root__',
    select: (context) => context.auth.user!.role,
  });

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={menuByRole[userRole]} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
