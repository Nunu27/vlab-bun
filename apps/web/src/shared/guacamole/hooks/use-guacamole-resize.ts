import type Guacamole from "guacamole-common-js";
import { type RefObject, useEffect } from "react";
import { useDebounceCallback } from "usehooks-ts";

interface UseGuacamoleResizeProps {
	clientRef: RefObject<Guacamole.Client | null>;
	containerRef: RefObject<HTMLDivElement | null>;
	isConnected: boolean;
}

export const useGuacamoleResize = ({
	clientRef,
	containerRef,
	isConnected,
}: UseGuacamoleResizeProps) => {
	const sendSize = useDebounceCallback(
		(dimension?: { width: number; height: number }) => {
			const client = clientRef.current;
			const container = containerRef.current;

			if (!container || !client) return;

			const targetWidth = Math.floor(container.clientWidth);
			const targetHeight = Math.floor(container.clientHeight);

			if (targetWidth < 0 && targetHeight < 0) return;
			if (!dimension) {
				const display = client.getDisplay();

				dimension = {
					width: display.getWidth(),
					height: display.getHeight(),
				};
			}

			if (
				dimension.width === targetWidth &&
				dimension.height === targetHeight
			) {
				return;
			}

			client.sendSize(targetWidth, targetHeight);
		},
		750,
	);

	useEffect(() => {
		if (!isConnected) return;

		const client = clientRef.current;
		const container = containerRef.current;

		if (!container || !client) return;

		const display = client.getDisplay();

		display.onresize = (width, height) => {
			sendSize({ width, height });
		};

		const resizeObserver = new ResizeObserver(() => {
			sendSize();
		});

		resizeObserver.observe(container);

		return () => {
			display.onresize = null;
			resizeObserver.unobserve(container);
			resizeObserver.disconnect();
		};
	}, [clientRef, containerRef, isConnected, sendSize]);
};
