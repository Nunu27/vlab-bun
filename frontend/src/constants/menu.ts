import type { Role } from '@backend/db/schema';
import { DatabaseIcon, LayoutDashboardIcon, UsersIcon } from 'lucide-react';
import type { ElementType } from 'react';

type Menu = {
  title: string;
  url: string;
  icon: ElementType;
};

type MenuWithSub = {
  title: string;
  icon: ElementType;
  items: {
    title: string;
    url: string;
  }[];
};

export type MenuItem = Menu | MenuWithSub;

export const menuByRole: Record<Role, MenuItem[]> = {
  student: [],
  lecturer: [],
  admin: [
    {
      title: 'Dashboard',
      url: '/',
      icon: LayoutDashboardIcon,
    },
    {
      title: 'Master Data',
      icon: DatabaseIcon,
      items: [
        {
          title: 'Department',
          url: '/master/department',
        },
        {
          title: 'Study Program',
          url: '/master/study-program',
        },
        {
          title: 'Lab Device',
          url: '/master/device',
        },
      ],
    },
    {
      title: 'User',
      icon: UsersIcon,
      items: [
        {
          title: 'Student',
          url: '/user/student',
        },
        {
          title: 'Lecturer',
          url: '/user/lecturer',
        },
        {
          title: 'Admin',
          url: '/user/admin',
        },
      ],
    },
  ],
};
