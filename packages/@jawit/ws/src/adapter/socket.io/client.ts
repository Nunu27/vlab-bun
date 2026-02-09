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
	private connectionHandlers = new Set<(isConnected: boolean) => void>();
	private boundOnConnect?: () => void;
	private boundOnDisconnect?: () => void;

	public attach(socket: Socket) {
		this.socket = socket;
		return this;
	}

	get isConnected(): boolean {
		return this.socket?.connected ?? false;
	}

	subscribeConnectionState(
		handler: (isConnected: boolean) => void,
	): () => void {
		if (!this.socket) {
			throw new Error("SocketIOClient is not attached to a socket.");
		}

		this.connectionHandlers.add(handler);

		if (this.connectionHandlers.size === 1) {
			this.boundOnConnect = () => {
				for (const h of this.connectionHandlers) h(true);
			};
			this.boundOnDisconnect = () => {
				for (const h of this.connectionHandlers) h(false);
			};
			this.socket.on("connect", this.boundOnConnect);
			this.socket.on("disconnect", this.boundOnDisconnect);
		}

		handler(this.socket.connected);

		return () => {
			this.connectionHandlers.delete(handler);
			if (this.connectionHandlers.size === 0) {
				if (this.boundOnConnect)
					this.socket?.off("connect", this.boundOnConnect);
				if (this.boundOnDisconnect)
					this.socket?.off("disconnect", this.boundOnDisconnect);
				this.boundOnConnect = undefined;
				this.boundOnDisconnect = undefined;
			}
		};
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
			onError?: (error: string) => void;
			timeoutMs?: number;
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

		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		if (config.callbacks || config.onError) {
			this.socket.on(
				replyEvent,
				(replyPayload: { type: string; data: unknown }) => {
					if (replyPayload.type === "__error") {
						config.onError?.(replyPayload.data as string);
						return;
					}

					const fn = config.callbacks?.[replyPayload.type];
					if (fn) {
						fn(replyPayload.data);
					}
				},
			);

			const ms = config.timeoutMs ?? 15000;
			timeoutId = setTimeout(() => {
				config.onError?.(`Timeout: Server did not respond within ${ms}ms`);
				this.socket?.off(replyEvent);
			}, ms);
		}

		this.socket.emit(event, payload);

		return () => {
			if (config.callbacks || config.onError) {
				this.socket?.off(replyEvent);
				if (timeoutId) clearTimeout(timeoutId);
			}
			this.socket?.emit("_jawit:cancel", `${event}::${requestId}`);
		};
	}
}
