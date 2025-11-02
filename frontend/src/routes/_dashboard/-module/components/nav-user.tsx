'use client';

import { LogOutIcon } from 'lucide-react';

import { Button } from '@frontend/components/ui/button';
import { SidebarMenu, SidebarMenuItem } from '@frontend/components/ui/sidebar';
import { useRouteContext } from '@tanstack/react-router';

export function NavUser() {
  const auth = useRouteContext({
    from: '__root__',
    select: (context) => context.auth,
  });
  const user = auth.user!;

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex p-2">
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">{user.name}</span>
          <span className="truncate text-xs">{user.email}</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="cursor-pointer"
          onClick={auth.logout}
        >
          <LogOutIcon />
        </Button>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
