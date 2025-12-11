import deviceWSHandler from "./device/ws";
import labWSHandler from "./lab/ws";

export const wsHandlers = { ...deviceWSHandler, ...labWSHandler } as const;
