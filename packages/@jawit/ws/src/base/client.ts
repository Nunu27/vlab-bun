import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type {
	EventParams,
	ExtractWSContracts,
	Simplify,
	WSClientCallbacksConfig,
	WSClientDataConfig,
	WSClientHandler,
	WSParamsConfig,
} from "../types";
import type WSContracts from "./contracts";

// biome-ignore lint/suspicious/noExplicitAny: generic constraint
abstract class WSClient<TWSContracts extends WSContracts<any, any>> {
	constructor(protected contracts: TWSContracts) {}

	// Connection State
	abstract get isConnected(): boolean;
	abstract subscribeConnectionState(
		handler: (isConnected: boolean) => void,
	): () => void;

	// Subscribe to server2client | inter events based on contracts, should return a function to unsubscribe
	abstract subscribe<
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
	): () => void;

	// Emit client2server | inter events based on contracts. it should also accept a callback for each reply registered in that event contract
	abstract emit<
		const TEvent extends keyof ExtractWSContracts<
			TWSContracts["contracts"],
			"client2server" | "inter"
		> &
			string,
	>(
		event: TEvent,
		config: Simplify<
			WSClientDataConfig<TWSContracts["contracts"][TEvent]> &
				WSParamsConfig<TEvent> &
				WSClientCallbacksConfig<TWSContracts["contracts"][TEvent]>
		>,
	): () => void;

	public validateIncomingData<
		const TEvent extends keyof ExtractWSContracts<
			TWSContracts["contracts"],
			"server2client" | "inter"
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
}

export default WSClient;
