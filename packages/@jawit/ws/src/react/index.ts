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
	ExtractWSData,
	WSClientEmitConfig,
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
		TContracts["contracts"],
		"server2client" | "inter"
	> &
		string;

	type ClientServerInterEvents = keyof ExtractWSContracts<
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
			(config: WSClientEmitConfig<TEvent, TContracts["contracts"][TEvent]>) => {
				dispose();
				const unsubscribe = client.emit(event, config);
				disposeRef.current = unsubscribe;
			},
			[event, dispose],
		);

		useEffect(() => {
			return () => dispose();
		}, [dispose]);

		return { send, dispose };
	}

	type WSDataValue<TEvent extends ServerClientInterEvents> = ExtractWSData<
		TContracts["contracts"][TEvent]
	>;

	type UseWSDataArgs<
		TEvent extends ServerClientInterEvents,
		TRequired extends boolean = false,
	> = keyof EventParams<TEvent> extends never
		? TRequired extends true
			? [options: { default: WSDataValue<TEvent>; enabled?: boolean }]
			: [options?: { default?: WSDataValue<TEvent>; enabled?: boolean }]
		: TRequired extends true
			? [
					options: {
						params: EventParams<TEvent>;
						default: WSDataValue<TEvent>;
						enabled?: boolean;
					},
				]
			: [
					options: {
						params: EventParams<TEvent>;
						default?: WSDataValue<TEvent>;
						enabled?: boolean;
					},
				];

	function useWSData<TEvent extends ServerClientInterEvents>(
		event: TEvent,
		...args: UseWSDataArgs<TEvent, true>
	): WSDataValue<TEvent>;

	function useWSData<TEvent extends ServerClientInterEvents>(
		event: TEvent,
		...args: UseWSDataArgs<TEvent, false>
	): WSDataValue<TEvent> | undefined;

	function useWSData<TEvent extends ServerClientInterEvents>(
		event: TEvent,
		...args: UseWSDataArgs<TEvent, false>
	) {
		const options = args[0] ?? {};
		const params = "params" in options ? options.params : undefined;
		const defaultValue = options?.default;
		const enabled = options?.enabled ?? true;

		const memoizedParams = useDeepCompareMemoize(params);
		const isConnected = useWSConnectionState();

		const [data, setData] = useState<WSDataValue<TEvent> | undefined>(
			defaultValue,
		);

		useEffect(() => {
			if (!isConnected || !enabled) return;

			let unsubscribe: () => void;
			const handler = (newData: WSDataValue<TEvent>) => {
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
		}, [event, memoizedParams, isConnected, enabled]);

		return data;
	}

	type UseWSEventArgs<TEvent extends ServerClientInterEvents> =
		keyof EventParams<TEvent> extends never
			? [
					options: {
						handler: WSClientHandler<TContracts["contracts"][TEvent]>;
						enabled?: boolean;
					},
				]
			: [
					options: {
						params: EventParams<TEvent>;
						handler: WSClientHandler<TContracts["contracts"][TEvent]>;
						enabled?: boolean;
					},
				];

	function useWSEvent<TEvent extends ServerClientInterEvents>(
		event: TEvent,
		...args: UseWSEventArgs<TEvent>
	) {
		const options = args[0];
		const params = "params" in options ? options.params : undefined;
		const handler = options.handler;
		const enabled = options.enabled ?? true;

		const memoizedParams = useDeepCompareMemoize(params);
		const isConnected = useWSConnectionState();

		const handlerRef = useRef<UseWSEventArgs<TEvent>[0]["handler"]>(handler);

		useEffect(() => {
			handlerRef.current = handler;
		}, [handler]);

		useEffect(() => {
			if (!isConnected || !enabled) return;

			let unsubscribe: () => void;

			const currentHandler = (data: WSDataValue<TEvent>) => {
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
		}, [event, memoizedParams, isConnected, enabled]);
	}

	return {
		useWSConnectionState,
		useWSAction,
		useWSData,
		useWSEvent,
	};
}
