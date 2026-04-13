import type { Static, TProperties, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type {
	ExtractMeta,
	ExtractWSContracts,
	MaybePromise,
	WSEventType,
	WSServerHandler,
	WSServerMiddleware,
} from "../types";
import type WSContracts from "./contracts";

// Internal shape used by the handler map — wide enough to avoid repeating generics
// everywhere, but still typed (no `any`).
type AnyContract = {
	event: string;
	type: WSEventType;
	data?: TSchema;
	replies?: TProperties;
};

/**
 * Framework-agnostic WebSocket server base.
 *
 * Stores the middleware pipeline and per-event handlers derived from a
 * `WSContracts` instance. Concrete adapters (e.g. `SocketIOServer`) extend this
 * class and call `runMiddlewares` / `validateIncomingData` from their transport
 * connection handlers.
 */
class WSServer<
	// biome-ignore lint/suspicious/noExplicitAny: generic constraint
	TWSContracts extends WSContracts<any, any>,
	TContext = unknown,
> {
	/** Per-event cleanup handlers invoked when a client leaves the execution room. */
	public disposeHandlers = new Map<
		string,
		(ctx: { executionId: string; socketId: string }) => MaybePromise<void>
	>();

	protected middlewares: WSServerMiddleware<
		TContext,
		ExtractMeta<TWSContracts>
	>[] = [];

	protected handlers = new Map<
		string,
		WSServerHandler<string, AnyContract, TContext>
	>();

	constructor(public readonly contracts: TWSContracts) {}

	/** Add a middleware to the global pipeline. Middlewares run in registration order. */
	use(middleware: WSServerMiddleware<TContext, ExtractMeta<TWSContracts>>) {
		this.middlewares.push(middleware);
		return this;
	}

	/** Register a handler for a `client2server` or `inter` event. */
	on<
		const TEvent extends keyof ExtractWSContracts<
			TWSContracts["contracts"],
			"client2server" | "inter"
		> &
			string,
	>(
		event: TEvent,
		handler: WSServerHandler<
			TEvent,
			TWSContracts["contracts"][TEvent],
			TContext
		>,
	) {
		this.handlers.set(
			event,
			handler as WSServerHandler<string, AnyContract, TContext>,
		);
		return this;
	}

	/**
	 * Validates incoming payload data against the registered contract schema.
	 * Throws a descriptive error if the schema check fails.
	 */
	public validateIncomingData<
		const TEvent extends keyof ExtractWSContracts<
			TWSContracts["contracts"],
			"client2server" | "inter"
		> &
			string,
	>(
		event: TEvent,
		data: unknown,
	): Static<TWSContracts["contracts"][TEvent]["data"]> {
		const contract = this.contracts.contracts[event as string] as
			| { data?: TSchema }
			| undefined;

		if (!contract) {
			throw new Error(`No contract registered for event: "${event}"`);
		}

		if (contract.data && !Value.Check(contract.data, data)) {
			throw new Error(
				`Payload validation failed for event "${event}": ${JSON.stringify(Value.Errors(contract.data, data).First())}`,
			);
		}

		return data as Static<TWSContracts["contracts"][TEvent]["data"]>;
	}

	/** Register a cleanup handler called when a client leaves the execution room. */
	onDispose<
		const TEvent extends keyof ExtractWSContracts<
			TWSContracts["contracts"],
			"client2server" | "inter"
		> &
			string,
	>(
		event: TEvent,
		cleanup: (ctx: {
			executionId: string;
			socketId: string;
		}) => MaybePromise<void>,
	) {
		this.disposeHandlers.set(event as string, cleanup);
		return this;
	}
}

export default WSServer;
