import type { Role } from '@vlab/shared/enums';
import { DatabaseIcon, FlaskConicalIcon, UsersIcon } from 'lucide-react';
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
  student: [
    // {
    //   title: 'Dashboard',
    //   url: '/',
    //   icon: LayoutDashboardIcon,
    // },
    {
      title: 'Labs',
      url: '/lab',
      icon: FlaskConicalIcon,
    },
  ],
  lecturer: [
    // {
    //   title: 'Dashboard',
    //   url: '/',
    //   icon: LayoutDashboardIcon,
    // },
    {
      title: 'Labs',
      url: '/lab',
      icon: FlaskConicalIcon,
    },
  ],
  admin: [
    // {
    //   title: 'Dashboard',
    //   url: '/',
    //   icon: LayoutDashboardIcon,
    // },
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
      ],
    },
    {
      title: 'Lab Data',
      icon: FlaskConicalIcon,
      items: [
        {
          title: 'Device Category',
          url: '/lab/device-category',
        },
        {
          title: 'Device',
          url: '/lab/device',
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
