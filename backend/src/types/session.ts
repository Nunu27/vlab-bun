import { Role } from "@/db/schema";

export type Session = {
	id: string;
	role: Role;
};
