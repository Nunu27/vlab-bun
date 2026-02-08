import {
	BookOpenIcon,
	Building2Icon,
	FlaskConicalIcon,
	GraduationCapIcon,
	HomeIcon,
	MonitorIcon,
	ShieldCheckIcon,
	TagsIcon,
	UserCheckIcon,
} from "lucide-react";
import type { ElementType } from "react";

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

export const menuByRole: Record<string, MenuSection[]> = {
	student: [
		{
			items: [
				{
					title: "Dashboard",
					url: "/",
					icon: HomeIcon,
				},
				{
					title: "Labs",
					url: "/lab",
					icon: FlaskConicalIcon,
				},
			],
		},
	],
	lecturer: [
		{
			items: [
				{
					title: "Dashboard",
					url: "/",
					icon: HomeIcon,
				},
			],
		},
		{
			title: "Main",
			items: [
				{
					title: "Labs",
					url: "/lab",
					icon: FlaskConicalIcon,
				},
			],
		},
	],
	admin: [
		{
			items: [
				{
					title: "Dashboard",
					url: "/",
					icon: HomeIcon,
				},
			],
		},
		{
			title: "Master Data",
			items: [
				{
					title: "Department",
					url: "/master/department",
					icon: Building2Icon,
				},
				{
					title: "Study Program",
					url: "/master/study-program",
					icon: BookOpenIcon,
				},
			],
		},
		{
			title: "Lab Data",
			items: [
				{
					title: "Device Category",
					url: "/lab-data/device-category",
					icon: TagsIcon,
				},
				{
					title: "Device Template",
					url: "/lab-data/device-template",
					icon: MonitorIcon,
				},
			],
		},
		{
			title: "User Management",
			items: [
				{
					title: "Student",
					url: "/user/student",
					icon: GraduationCapIcon,
				},
				{
					title: "Instructor",
					url: "/user/instructor",
					icon: UserCheckIcon,
				},
				{
					title: "Admin",
					url: "/user/admin",
					icon: ShieldCheckIcon,
				},
			],
		},
	],
};
