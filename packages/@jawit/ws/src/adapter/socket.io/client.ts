import type { Socket } from "socket.io-client";
import WSClient from "../../base/client";
import type WSContracts from "../../base/contracts";
import { SubscriptionManager } from "../../base/subscription-manager";
import type {
	EventParams,
	ExtractWSContracts,
	WSClientHandler,
} from "../../types";
import { compileEventPath } from "../../utils";

export default class SocketIOClient<
	// biome-ignore lint/suspicious/noExplicitAny: generic constraint
	TWSContracts extends WSContracts<any, any>,
> extends WSClient<TWSContracts> {
	public socket?: Socket;

	/** Manages active subscription rooms and server-room join handlers. */
	private readonly subscriptionManager = new SubscriptionManager<() => void>();

	private readonly connectionHandlers = new Set<
		(isConnected: boolean) => void
	>();

	// Kept as instance fields so we can remove them when socket changes.
	private boundOnConnect?: () => void;
	private boundOnDisconnect?: () => void;

	private notifySubscriptionsChanged() {
		this.metrics?.onSubscriptionsChanged?.(
			this.subscriptionManager.getTopics(),
		);
	}

	protected override onMetricsChanged(): void {
		if (!this.socket) return;

		this.socket.offAny();
		this.socket.offAnyOutgoing();

		if (this.metrics) {
			this.socket.onAny((event, ...args) => {
				this.metrics?.onLog?.({ type: "incoming", event, args });
			});

			this.socket.onAnyOutgoing((event, ...args) => {
				this.metrics?.onLog?.({ type: "outgoing", event, args });
			});
			this.notifySubscriptionsChanged();
		}
	}

	// ─── Socket attachment ────────────────────────────────────────────────────

	public attach(socket: Socket) {
		// Tear down listeners from any previously attached socket.
		if (this.socket && this.socket !== socket) {
			this.socket.offAny();
			this.socket.offAnyOutgoing();
			if (this.boundOnConnect) this.socket.off("connect", this.boundOnConnect);
			if (this.boundOnDisconnect)
				this.socket.off("disconnect", this.boundOnDisconnect);
		}

		this.socket = socket;

		// Forward all traffic to metrics observer if attached.
		if (this.metrics) {
			socket.onAny((event, ...args) => {
				this.metrics?.onLog?.({ type: "incoming", event, args });
			});

			socket.onAnyOutgoing((event, ...args) => {
				this.metrics?.onLog?.({ type: "outgoing", event, args });
			});
		}

		// Re-wire connection-state listeners to the new socket.
		if (this.connectionHandlers.size > 0) {
			this.boundOnConnect = () => {
				for (const h of this.connectionHandlers) h(true);
			};
			this.boundOnDisconnect = () => {
				for (const h of this.connectionHandlers) h(false);
			};
			socket.on("connect", this.boundOnConnect);
			socket.on("disconnect", this.boundOnDisconnect);
		}

		return this;
	}

	// ─── WSClient implementation ──────────────────────────────────────────────

	get isConnected(): boolean {
		return this.socket?.connected ?? false;
	}

	subscribeConnectionState(
		handler: (isConnected: boolean) => void,
	): () => void {
		this.connectionHandlers.add(handler);

		// Register socket listeners only when the first handler is added.
		if (this.connectionHandlers.size === 1 && this.socket) {
			this.boundOnConnect = () => {
				for (const h of this.connectionHandlers) h(true);
			};
			this.boundOnDisconnect = () => {
				for (const h of this.connectionHandlers) h(false);
			};
			this.socket.on("connect", this.boundOnConnect);
			this.socket.on("disconnect", this.boundOnDisconnect);
		}

		// Immediately emit current state if socket is available.
		if (this.socket) handler(this.socket.connected);

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
			TWSContracts["contracts"],
			"server2client" | "inter"
		> &
			string,
	>(
		event: TEvent,
		...args: keyof EventParams<TEvent> extends never
			? [handler: WSClientHandler<TWSContracts["contracts"][TEvent]>]
			: [
					params: EventParams<TEvent>,
					handler: WSClientHandler<TWSContracts["contracts"][TEvent]>,
				]
	): () => void {
		if (!this.socket) {
			throw new Error("SocketIOClient is not attached to a socket.");
		}

		const handler = (args.length === 2 ? args[1] : args[0]) as WSClientHandler<
			TWSContracts["contracts"][TEvent]
		>;
		const params = args.length === 2 ? args[0] : undefined;

		const compiledEvent = compileEventPath(
			event as string,
			params as Record<string, unknown> | undefined,
		);

		// Wrap the user handler to filter by params and validate the payload.
		const socketHandler = (payload: {
			data: unknown;
			params?: Record<string, unknown>;
		}) => {
			// Filter by params when a parameterised event path was requested.
			if (params && payload.params) {
				for (const [key, value] of Object.entries(
					params as Record<string, unknown>,
				)) {
					if (payload.params[key] !== value) return;
				}
			}

			try {
				const validatedData = this.validateIncomingData(event, payload.data);
				this.metrics?.onData?.(compiledEvent, validatedData);
				try {
					handler(validatedData as Parameters<typeof handler>[0]);
				} catch (err) {
					console.error(`[jawit/ws] Handler error for "${event}":`, err);
				}
			} catch (err) {
				console.error(`[jawit/ws] Validation error for "${event}":`, err);
			}
		};

		// Track the room subscription count. The first subscriber joins the server room.
		const { isFirst, data: onConnect } = this.subscriptionManager.subscribe(
			compiledEvent,
			() => {
				const handler = () => {
					this.socket?.emit("_jawit:subscribe", compiledEvent);
				};
				return handler;
			},
		);

		if (isFirst) {
			this.notifySubscriptionsChanged();
			this.socket.on("connect", onConnect);
			if (this.socket.connected) onConnect();
		}

		this.socket.on(compiledEvent, socketHandler);

		return () => {
			this.socket?.off(compiledEvent, socketHandler);

			const { isLast, data: currentOnConnect } =
				this.subscriptionManager.unsubscribe(compiledEvent);

			if (isLast && currentOnConnect) {
				this.socket?.emit("_jawit:unsubscribe", compiledEvent);
				this.socket?.off("connect", currentOnConnect);
				this.notifySubscriptionsChanged();
			}
		};
	}

	emit<
		const TEvent extends keyof ExtractWSContracts<
			TWSContracts["contracts"],
			"client2server" | "inter"
		> &
			string,
	>(
		event: TEvent,
		// biome-ignore lint/suspicious/noExplicitAny: interface implementation override constraint
		config: any,
	): () => void {
		if (!this.socket) {
			throw new Error("SocketIOClient is not attached to a socket.");
		}

		const requestId = crypto.randomUUID();
		const replyEvent = `${event}:reply:${requestId}`;

		const payload = {
			data: config.data,
			params: config.params,
			requestId,
		};

		if (config.callbacks || config.onError) {
			this.socket.on(
				replyEvent,
				(replyPayload: { type: string; data: unknown }) => {
					if (replyPayload.type === "__error") {
						config.onError?.(replyPayload.data as string);
						return;
					}
					config.callbacks?.[replyPayload.type]?.(replyPayload.data);
				},
			);
		}

		this.socket.emit(event, payload);

		return () => {
			if (config.callbacks || config.onError) {
				this.socket?.off(replyEvent);
			}
			this.socket?.emit("_jawit:cancel", `${event}::${requestId}`);
		};
	}
}
