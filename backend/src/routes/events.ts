import deviceEvents from "./device/events";

export const events = [...deviceEvents] as const;
