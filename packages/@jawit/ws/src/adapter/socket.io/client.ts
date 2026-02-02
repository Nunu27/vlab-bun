import type { Socket } from "socket.io-client";
import WSClient from "../../base/client";
import type WSContracts from "../../base/contracts";
import type {
	EventParams,
	ExtractWSContracts,
	WSClientHandler,
} from "../../types";

export default class SocketIOClient<
	// biome-ignore lint/suspicious/noExplicitAny: generic constraint
	TWSContracts extends WSContracts<any, any>,
> extends WSClient<TWSContracts> {
	private socket?: Socket;

	public attach(socket: Socket) {
		this.socket = socket;
		return this;
	}

	subscribe<
		const TEvent extends keyof ExtractWSContracts<
			Record<string, unknown>,
			TWSContracts["contracts"],
			"server2client" | "inter"
		> &
			string,
	>(
		event: TEvent,
		...args: EventParams<TEvent> extends never
			? [handler: WSClientHandler<TWSContracts["contracts"][TEvent]>]
			: [
					params: EventParams<TEvent>,
					handler: WSClientHandler<TWSContracts["contracts"][TEvent]>,
				]
	): () => void {
		const handler = (args.length === 2 ? args[1] : args[0]) as WSClientHandler<
			TWSContracts["contracts"][TEvent]
		>;
		const params = args.length === 2 ? args[0] : undefined;

		const socketHandler = (payload: {
			data: unknown;
			params?: Record<string, unknown>;
		}) => {
			try {
				if (params && payload.params) {
					for (const [key, value] of Object.entries(params)) {
						if (payload.params[key] !== value) {
							return;
						}
					}
				}

				const validatedData = this.validateIncomingData(event, payload.data);
				handler(validatedData as Parameters<typeof handler>[0]);
			} catch (err) {
				console.error(`Validation error on ${event}:`, err);
			}
		};

		if (!this.socket) {
			throw new Error("SocketIOClient is not attached to a socket.");
		}

		this.socket.on(event as string, socketHandler);

		return () => {
			this.socket?.off(event as string, socketHandler);
		};
	}

	emit<
		const TEvent extends keyof ExtractWSContracts<
			Record<string, unknown>,
			TWSContracts["contracts"],
			"client2server" | "inter"
		> &
			string,
	>(
		event: TEvent,
		config: {
			data: unknown;
			params?: Record<string, unknown>;
			callbacks?: Record<string, (data: unknown) => void>;
		},
	): () => void {
		const requestId = crypto.randomUUID();

		const payload = {
			data: config.data,
			params: config.params,
			requestId,
		};

		const replyEvent = `${event}:reply:${requestId}`;

		if (!this.socket) {
			throw new Error("SocketIOClient is not attached to a socket.");
		}

		if (config.callbacks) {
			this.socket.on(
				replyEvent,
				(replyPayload: { type: string; data: unknown }) => {
					const fn = config.callbacks?.[replyPayload.type];
					if (fn) {
						fn(replyPayload.data);
					}
				},
			);
		}

		this.socket.emit(event, payload);

		return () => {
			if (config.callbacks) {
				this.socket?.off(replyEvent);
			}
			this.socket?.emit("_jawit:cancel", `${event}::${requestId}`);
		};
	}
}
