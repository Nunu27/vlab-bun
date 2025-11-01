import type { Role } from '@backend/db/schema';
import { DatabaseIcon, LayoutDashboardIcon, UsersIcon } from 'lucide-react';
import type { ElementType } from 'react';

export type MenuItem = {
  title: string;
  url: string;
  icon: ElementType;
  items?: {
    title: string;
    url: string;
  }[];
};

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
      url: '#',
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
      url: '#',
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
