/** biome-ignore-all lint/suspicious/noExplicitAny: generic constraint */
import type { Static, TProperties, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type {
	ExtractMeta,
	ExtractWSContracts,
	MaybePromise,
	WSServerHandler,
	WSServerMiddleware,
} from "../types";
import type WSContracts from "./contracts";

class WSServer<TWSContracts extends WSContracts<any, any>, TContext = unknown> {
	// Active cleanup handlers registered statically per event string
	public disposeHandlers = new Map<
		string,
		(ctx: { executionId: string; socketId: string }) => MaybePromise<void>
	>();

	// Global middleware hooks
	protected middlewares: WSServerMiddleware<
		TContext,
		ExtractMeta<TWSContracts>
	>[] = [];

	// Event handlers registered
	protected handlers = new Map<
		string,
		WSServerHandler<
			string,
			{ data: TSchema; event: string; type: any; replies?: TProperties },
			TContext
		>
	>();

	constructor(public readonly contracts: TWSContracts) {}

	// Register global middleware pipeline
	use(middleware: WSServerMiddleware<TContext, ExtractMeta<TWSContracts>>) {
		this.middlewares.push(middleware);
		return this;
	}

	// Register handler for client2server | inter events based on contracts
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
			handler as WSServerHandler<
				string,
				{ data: TSchema; event: string; type: any; replies?: TProperties },
				TContext
			>,
		);
		return this;
	}

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
			| { data: TSchema }
			| undefined;
		if (!contract) {
			throw new Error(`Event contract not found for: ${event}`);
		}

		if (!Value.Check(contract.data, data)) {
			throw new Error(`Data validation failed for event: ${event}`);
		}

		return data as Static<TWSContracts["contracts"][TEvent]["data"]>;
	}

	// Register a stateless cleanup handler invoked specifically per-event
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
