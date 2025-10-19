import { Role } from "@/db/schema/auth";

export type Session = {
	id: string;
	role: Role;
};
