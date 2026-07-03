import type {
	WSDataOf,
	WSDataRouteNames,
	WSParamsOf,
	WSRpcPayloadOf,
	WSRpcRepliesOf,
	WSRpcResponseOf,
	WSRpcRouteNames,
} from "@vlab/ws";
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

export function useWSData<Name extends WSDataRouteNames & string>(
	name: Name,
	options: {
		params?: NoInfer<WSParamsOf<Name>>;
		initialData?: NoInfer<WSDataOf<Name>>;
		enabled?: boolean;
	} = {},
) {
	const [data, setData] = useState<WSDataOf<Name> | undefined>(
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

export function useWSEvent<Name extends WSDataRouteNames & string>(
	name: Name,
	options: {
		params?: NoInfer<WSParamsOf<Name>>;
		handler: (data: NoInfer<WSDataOf<Name>>) => void;
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

export function useWSAction<Name extends WSRpcRouteNames & string>(name: Name) {
	const disposeRef = useRef<() => void>(undefined);

	const send = useCallback(
		(args: {
			data?: WSRpcPayloadOf<Name>;
			params?: WSParamsOf<Name>;
			onError?: (error: string) => void;
			onResponse?: (res: WSRpcResponseOf<Name>) => void;
			callbacks?: Partial<
				Record<keyof WSRpcRepliesOf<Name>, (data: any) => void>
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
