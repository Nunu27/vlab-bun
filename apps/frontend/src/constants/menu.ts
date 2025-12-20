import type { Role } from '@vlab/shared/enums';
import {
  BookOpenIcon,
  Building2Icon,
  FlaskConicalIcon,
  GraduationCapIcon,
  MonitorIcon,
  ShieldCheckIcon,
  TagsIcon,
  UserCheckIcon,
} from 'lucide-react';
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

export type MenuSection = {
  title?: string;
  items: MenuItem[];
};

export const menuByRole: Record<Role, MenuSection[]> = {
  student: [
    {
      title: 'Main',
      items: [
        {
          title: 'Labs',
          url: '/lab',
          icon: FlaskConicalIcon,
        },
      ],
    },
  ],
  lecturer: [
    {
      title: 'Main',
      items: [
        {
          title: 'Labs',
          url: '/lab',
          icon: FlaskConicalIcon,
        },
      ],
    },
  ],
  admin: [
    {
      title: 'Master Data',
      items: [
        {
          title: 'Department',
          url: '/master/department',
          icon: Building2Icon,
        },
        {
          title: 'Study Program',
          url: '/master/study-program',
          icon: BookOpenIcon,
        },
      ],
    },
    {
      title: 'Lab Data',
      items: [
        {
          title: 'Device Category',
          url: '/lab/device-category',
          icon: TagsIcon,
        },
        {
          title: 'Device',
          url: '/lab/device',
          icon: MonitorIcon,
        },
      ],
    },
    {
      title: 'User Management',
      items: [
        {
          title: 'Student',
          url: '/user/student',
          icon: GraduationCapIcon,
        },
        {
          title: 'Lecturer',
          url: '/user/lecturer',
          icon: UserCheckIcon,
        },
        {
          title: 'Admin',
          url: '/user/admin',
          icon: ShieldCheckIcon,
        },
      ],
    },
  ],
};
