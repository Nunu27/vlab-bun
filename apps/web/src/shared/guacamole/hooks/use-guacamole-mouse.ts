import Guacamole from "guacamole-common-js";
import { type RefObject, useCallback, useEffect } from "react";

interface UseGuacamoleMouseProps {
	clientRef: RefObject<Guacamole.Client | null>;
	displayElementRef: RefObject<HTMLElement | null>;
	containerRef: RefObject<HTMLDivElement | null>;
	isConnected: boolean;
}

export const useGuacamoleMouse = ({
	clientRef,
	displayElementRef,
	containerRef,
	isConnected,
}: UseGuacamoleMouseProps) => {
	const sendMouseState = useCallback(
		(clientX: number, clientY: number, buttons: number) => {
			const client = clientRef.current;
			const container = containerRef.current;

			if (!isConnected || !client || !container) return;

			const rect = container.getBoundingClientRect();
			const x = Math.floor(clientX - rect.left);
			const y = Math.floor(clientY - rect.top);

			const clampedX = Math.max(0, Math.min(x, Math.floor(rect.width) - 1));
			const clampedY = Math.max(0, Math.min(y, Math.floor(rect.height) - 1));

			const state = new Guacamole.Mouse.State(
				clampedX,
				clampedY,
				!!(buttons & 1),
				!!(buttons & 2),
				!!(buttons & 4),
				!!(buttons & 8),
				!!(buttons & 16),
			);

			client.sendMouseState(state);
		},
		[clientRef, containerRef, isConnected],
	);

	useEffect(() => {
		const displayElement = displayElementRef.current;
		if (!displayElement) return;

		const handleMouseDown = (e: MouseEvent) => {
			e.preventDefault();
			containerRef.current?.focus();
			sendMouseState(e.clientX, e.clientY, e.buttons);
		};

		const handleMouseUp = (e: MouseEvent) => {
			e.preventDefault();
			sendMouseState(e.clientX, e.clientY, e.buttons);
		};

		const handleMouseMove = (e: MouseEvent) => {
			e.preventDefault();
			clientRef.current?.getDisplay().showCursor(true);
			sendMouseState(e.clientX, e.clientY, e.buttons);
		};

		const handleMouseLeave = () => {
			const client = clientRef.current;
			if (!isConnected || !client) return;

			client.getDisplay().showCursor(false);

			const state = new Guacamole.Mouse.State(
				-1,
				-1,
				false,
				false,
				false,
				false,
				false,
			);
			client.sendMouseState(state);
		};

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			if (e.deltaY === 0) return;

			const mask = e.deltaY < 0 ? 8 : 16;
			sendMouseState(e.clientX, e.clientY, e.buttons | mask);
			sendMouseState(e.clientX, e.clientY, e.buttons);
		};

		const handleContextMenu = (e: MouseEvent) => {
			e.preventDefault();
		};

		displayElement.addEventListener("mousedown", handleMouseDown);
		displayElement.addEventListener("mouseup", handleMouseUp);
		displayElement.addEventListener("mousemove", handleMouseMove);
		displayElement.addEventListener("mouseleave", handleMouseLeave);
		displayElement.addEventListener("wheel", handleWheel, { passive: false });
		displayElement.addEventListener("contextmenu", handleContextMenu);

		return () => {
			displayElement.removeEventListener("mousedown", handleMouseDown);
			displayElement.removeEventListener("mouseup", handleMouseUp);
			displayElement.removeEventListener("mousemove", handleMouseMove);
			displayElement.removeEventListener("mouseleave", handleMouseLeave);
			displayElement.removeEventListener("wheel", handleWheel);
			displayElement.removeEventListener("contextmenu", handleContextMenu);
		};
	}, [displayElementRef, clientRef, isConnected, sendMouseState]);
};
