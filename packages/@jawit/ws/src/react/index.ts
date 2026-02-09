import type { Static, TSchema } from "@sinclair/typebox";
import isEqual from "fast-deep-equal";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import type WSClient from "../base/client";
import type WSContracts from "../base/contracts";
import type {
	EventParams,
	ExtractWSContracts,
	WSClientHandler,
} from "../types";

function useDeepCompareMemoize<T>(value: T) {
	const ref = useRef<T>(value);
	if (!isEqual(value, ref.current)) {
		ref.current = value;
	}
	return ref.current;
}

export function createWSHooks<
	// biome-ignore lint/suspicious/noExplicitAny: generic constraint
	TContracts extends WSContracts<any, any>,
>(client: WSClient<TContracts>) {
	const subscribeConnection = (onStoreChange: () => void) => {
		return client.subscribeConnectionState(onStoreChange);
	};
	const getConnectionSnapshot = () => client.isConnected;

	function useWSConnectionState() {
		return useSyncExternalStore(subscribeConnection, getConnectionSnapshot);
	}

	type ServerClientInterEvents = keyof ExtractWSContracts<
		Record<string, unknown>,
		TContracts["contracts"],
		"server2client" | "inter"
	> &
		string;

	type ClientServerInterEvents = keyof ExtractWSContracts<
		Record<string, unknown>,
		TContracts["contracts"],
		"client2server" | "inter"
	> &
		string;

	function useWSAction<TEvent extends ClientServerInterEvents>(event: TEvent) {
		const disposeRef = useRef<(() => void) | null>(null);

		const dispose = useCallback(() => {
			if (disposeRef.current) {
				disposeRef.current();
				disposeRef.current = null;
			}
		}, []);

		const send = useCallback(
			(
				config: {
					data: Static<TContracts["contracts"][TEvent]["data"]>;
				} & (EventParams<TEvent> extends never
					? unknown
					: { params: EventParams<TEvent> }) &
					(TContracts["contracts"][TEvent]["replies"] extends undefined
						? unknown
						: {
								callbacks?: Partial<{
									[K in keyof NonNullable<
										TContracts["contracts"][TEvent]["replies"]
									>]: (
										data: NonNullable<
											TContracts["contracts"][TEvent]["replies"]
										>[K] extends TSchema
											? Static<
													NonNullable<
														TContracts["contracts"][TEvent]["replies"]
													>[K]
												>
											: never,
									) => void;
								}>;
								onError?: (error: string) => void;
								timeoutMs?: number;
							}),
			) => {
				dispose();
				const unsubscribe = client.emit(event, config);
				disposeRef.current = unsubscribe;
			},
			[event, dispose],
		);

		// Cleanup on unmount
		useEffect(() => {
			return () => dispose();
		}, [dispose]);

		return { send, dispose };
	}

	function useWSData<TEvent extends ServerClientInterEvents>(
		event: TEvent,
		...args: EventParams<TEvent> extends never
			? [
					options: {
						default: Static<TContracts["contracts"][TEvent]["data"]>;
					},
				]
			: [
					options: {
						params: EventParams<TEvent>;
						default: Static<TContracts["contracts"][TEvent]["data"]>;
					},
				]
	): Static<TContracts["contracts"][TEvent]["data"]>;

	function useWSData<TEvent extends ServerClientInterEvents>(
		event: TEvent,
		...args: EventParams<TEvent> extends never
			? [
					options?: {
						default?: Static<TContracts["contracts"][TEvent]["data"]>;
					},
				]
			: [
					options: {
						params: EventParams<TEvent>;
						default?: Static<TContracts["contracts"][TEvent]["data"]>;
					},
				]
	): Static<TContracts["contracts"][TEvent]["data"]> | undefined;

	function useWSData<TEvent extends ServerClientInterEvents>(
		event: TEvent,
		...args: EventParams<TEvent> extends never
			? [
					options?: {
						default?: Static<TContracts["contracts"][TEvent]["data"]>;
					},
				]
			: [
					options: {
						params: EventParams<TEvent>;
						default?: Static<TContracts["contracts"][TEvent]["data"]>;
					},
				]
	) {
		const options = args[0] as Record<string, unknown> | undefined;
		const params = options?.params;
		const defaultValue = options?.default as
			| Static<TContracts["contracts"][TEvent]["data"]>
			| undefined;

		const memoizedParams = useDeepCompareMemoize(params);
		const isConnected = useWSConnectionState();

		const [data, setData] = useState<
			Static<TContracts["contracts"][TEvent]["data"]> | undefined
		>(defaultValue);

		useEffect(() => {
			if (!isConnected) return;

			let unsubscribe: () => void;
			const handler = (
				newData: Static<TContracts["contracts"][TEvent]["data"]>,
			) => {
				setData(newData);
			};

			if (memoizedParams) {
				// @ts-expect-error Types perfectly match but ts struggles with generics here
				unsubscribe = client.subscribe(event, memoizedParams, handler);
			} else {
				// @ts-expect-error Types perfectly match but ts struggles with generics here
				unsubscribe = client.subscribe(event, handler);
			}

			return () => unsubscribe();
		}, [event, memoizedParams, isConnected]);

		return data;
	}

	function useWSEvent<TEvent extends ServerClientInterEvents>(
		event: TEvent,
		...args: EventParams<TEvent> extends never
			? [
					options: {
						handler: WSClientHandler<TContracts["contracts"][TEvent]>;
					},
				]
			: [
					options: {
						params: EventParams<TEvent>;
						handler: WSClientHandler<TContracts["contracts"][TEvent]>;
					},
				]
	) {
		const options = args[0] as Record<string, unknown>;
		const params = options.params;
		const handler = options.handler as WSClientHandler<
			TContracts["contracts"][TEvent]
		>;

		const memoizedParams = useDeepCompareMemoize(params);
		const isConnected = useWSConnectionState();

		const handlerRef =
			useRef<WSClientHandler<TContracts["contracts"][TEvent]>>(handler);

		useEffect(() => {
			handlerRef.current = handler;
		}, [handler]);

		useEffect(() => {
			if (!isConnected) return;

			let unsubscribe: () => void;

			const currentHandler = (
				data: Static<TContracts["contracts"][TEvent]["data"]>,
			) => {
				handlerRef.current?.(data);
			};

			if (memoizedParams) {
				// @ts-expect-error Types perfectly match but ts struggles with generics here
				unsubscribe = client.subscribe(event, memoizedParams, currentHandler);
			} else {
				// @ts-expect-error Types perfectly match but ts struggles with generics here
				unsubscribe = client.subscribe(event, currentHandler);
			}

			return () => unsubscribe();
		}, [event, memoizedParams, isConnected]);
	}

	return {
		useWSConnectionState,
		useWSAction,
		useWSData,
		useWSEvent,
	};
}
