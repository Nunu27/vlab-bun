import { createWSHooks } from "@jawit/ws/react";
import ws from "@web/lib/ws";

const { useWSConnectionState, useWSAction, useWSData, useWSEvent } =
	createWSHooks(ws);

export { useWSAction, useWSConnectionState, useWSData, useWSEvent };
