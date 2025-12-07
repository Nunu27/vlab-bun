import deviceWSHandler from "./device/ws";

export const wsHandlers = { ...deviceWSHandler } as const;
