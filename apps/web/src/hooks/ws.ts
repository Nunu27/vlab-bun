import type { Static } from "@sinclair/typebox";
import type { WSDataRoutes, WSParamsOf, WSRpcRoutes } from "@vlab/ws";
import ws, { socket } from "@web/lib/ws";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useWSConnectionState() {
	const [connected, setConnected] = useState(socket.connected);

	useEffect(() => {
		const onConnect = () => setConnected(true);
		const onDisconnect = () => setConnected(false);

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
		};
	}, []);

	return connected;
}

export function useWSData<Name extends Extract<keyof WSDataRoutes, string>>(
	name: Name,
	options: {
		params?: WSParamsOf<Name>;
		initialData?: Static<WSDataRoutes[Name]>;
		enabled?: boolean;
	} = {},
) {
	const [data, setData] = useState<Static<WSDataRoutes[Name]> | undefined>(
		options.initialData,
	);

	const paramsString = JSON.stringify(options.params);
	const memoizedParams = useMemo(() => options.params, [paramsString]);

	useEffect(() => {
		if (options.enabled === false) return;

		const dispose = ws.onData(name, {
			params: memoizedParams as any,
			callback: (newData) => {
				setData(newData);
			},
		});

		return () => {
			dispose();
		};
	}, [name, memoizedParams, options.enabled]);

	return data;
}

export function useWSEvent<Name extends Extract<keyof WSDataRoutes, string>>(
	name: Name,
	options: {
		params?: WSParamsOf<Name>;
		handler: (data: Static<WSDataRoutes[Name]>) => void;
	},
) {
	const handlerRef = useRef(options.handler);

	useEffect(() => {
		handlerRef.current = options.handler;
	}, [options.handler]);

	const paramsString = JSON.stringify(options.params);
	const memoizedParams = useMemo(() => options.params, [paramsString]);

	useEffect(() => {
		const dispose = ws.onData(name, {
			params: memoizedParams as any,
			callback: (data) => {
				handlerRef.current(data);
			},
		});

		return () => {
			dispose();
		};
	}, [name, memoizedParams]);
}

export function useWSAction<Name extends Extract<keyof WSRpcRoutes, string>>(
	name: Name,
) {
	const disposeRef = useRef<() => void>(undefined as any);

	const send = useCallback(
		(args: {
			data?: Static<WSRpcRoutes[Name]["payload"]>;
			params?: WSParamsOf<Name>;
			onError?: (error: string) => void;
			onResponse?: (res: Static<WSRpcRoutes[Name]["response"]>) => void;
			callbacks?: Partial<
				Record<keyof WSRpcRoutes[Name]["replies"], (data: any) => void>
			>;
		}) => {
			disposeRef.current?.();

			const callbacks: any = { ...args.callbacks };
			if (args.onError) callbacks.error = args.onError;
			if (args.onResponse) callbacks.response = args.onResponse;

			const dispose = ws.rpc(name as any, {
				params: args.params as any,
				payload: args.data as any,
				callbacks,
			});
			disposeRef.current = dispose;

			return dispose;
		},
		[name],
	);

	const dispose = useCallback(() => {
		disposeRef.current?.();
	}, []);

	useEffect(() => {
		return () => dispose();
	}, [dispose]);

	return { send, dispose };
}
