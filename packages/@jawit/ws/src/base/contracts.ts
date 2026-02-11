import type { TProperties, TSchema } from "@sinclair/typebox";
import type { BaseWSContract, WSEventType } from "../types";

class WSContracts<
	TMeta extends Record<string, unknown> = Record<string, never>,
	TContracts extends Record<string, BaseWSContract<TMeta>> = Record<
		string,
		never
	>,
> {
	contracts: TContracts = {} as TContracts;

	use<TNewEvents extends Record<string, BaseWSContract<TMeta>>>(
		contracts: WSContracts<TMeta, TNewEvents>,
	) {
		this.contracts = { ...this.contracts, ...contracts.contracts };

		return this as unknown as WSContracts<
			TMeta,
			TContracts extends Record<string, never>
				? TNewEvents
				: TContracts & TNewEvents
		>;
	}

	register<
		const TEvent extends string,
		TType extends WSEventType,
		TData extends TSchema | undefined = undefined,
		TReplies extends TProperties = never,
	>(
		config: TType extends "server2client"
			? {
					event: TEvent;
					type: TType;
					data?: TData;
				}
			: {
					event: TEvent;
					type: TType;
					data?: TData;
					replies?: TReplies;
					meta?: TMeta;
				},
	) {
		type Addition = Record<
			TEvent,
			{
				event: TEvent;
				type: TType;
				data?: TData;
				replies?: TReplies;
				meta?: TMeta;
			}
		>;

		this.contracts = { ...this.contracts, [config.event]: config };

		return this as unknown as WSContracts<
			TMeta,
			TContracts extends Record<string, never>
				? Addition
				: TContracts & Addition
		>;
	}
}

export default WSContracts;
