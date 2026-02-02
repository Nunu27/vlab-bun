import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type {
	EventParams,
	ExtractWSContracts,
	WSClientHandler,
} from "../types";
import type WSContracts from "./contracts";

// biome-ignore lint/suspicious/noExplicitAny: generic constraint
abstract class WSClient<TWSContracts extends WSContracts<any, any>> {
	constructor(protected contracts: TWSContracts) {}

	// Subscribe to server2client | inter events based on contracts, should return a function to unsubscribe
	abstract subscribe<
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
	): () => void;

	// Emit client2server | inter events based on contracts. it should also accept a callback for each reply registered in that event contract
	abstract emit<
		const TEvent extends keyof ExtractWSContracts<
			Record<string, unknown>,
			TWSContracts["contracts"],
			"client2server" | "inter"
		> &
			string,
	>(
		event: TEvent,
		config: {
			data: Static<TWSContracts["contracts"][TEvent]["data"]>;
		} & (EventParams<TEvent> extends never
			? unknown
			: { params: EventParams<TEvent> }) &
			(TWSContracts["contracts"][TEvent]["replies"] extends undefined
				? unknown
				: {
						callbacks?: Partial<{
							[K in keyof NonNullable<
								TWSContracts["contracts"][TEvent]["replies"]
							>]: (
								data: Static<
									NonNullable<TWSContracts["contracts"][TEvent]["replies"]>[K]
								>,
							) => void;
						}>;
					}),
	): () => void;

	public validateIncomingData<
		const TEvent extends keyof ExtractWSContracts<
			Record<string, unknown>,
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
