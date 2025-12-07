import type { Role } from "../enums";

export type Session = {
	id: string;
	role: Role;
	useCAS?: boolean;
};
