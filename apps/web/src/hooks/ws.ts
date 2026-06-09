import type { Static } from "@sinclair/typebox";
import type { WSDataRoutes, WSParamsOf, WSRpcRoutes } from "@vlab/ws";
import ws, { socket } from "@web/lib/ws";
import { useCallback, useEffect, useRef, useState } from "react";

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
	} = {},
) {
	const [data, setData] = useState<Static<WSDataRoutes[Name]> | undefined>(
		options.initialData,
	);

	useEffect(() => {
		const dispose = ws.onData(name as any, options.params as any, (newData) => {
			setData(newData as any);
		});

		return () => {
			dispose();
		};
	}, [name, options.params]);

	return data;
}

export function useWSEvent<Name extends Extract<keyof WSDataRoutes, string>>(
	name: Name,
	options: {
		params?: WSParamsOf<Name>;
		handler: (data: Static<WSDataRoutes[Name]>) => void;
	},
) {
	useEffect(() => {
		const dispose = ws.onData(
			name as any,
			options.params as any,
			options.handler as any,
		);

		return () => {
			dispose();
		};
	}, [name, options.handler, options.params]);
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

			const dispose = ws.rpc(
				name as any,
				args.params as any,
				args.data as any,
				callbacks,
			);
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
