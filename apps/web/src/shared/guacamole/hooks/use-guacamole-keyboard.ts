import Guacamole from "guacamole-common-js";
import { type RefObject, useEffect } from "react";

// Keys that should have their browser default prevented when the session is
// active, even without a modifier held. Printable characters are excluded so
// that the subsequent `keypress` event still fires — Guacamole.Keyboard relies
// on it for character keysym resolution.
const NON_PRINTABLE_KEYS = new Set([
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"Tab",
	"Backspace",
	"Delete",
	"Insert",
	"Home",
	"End",
	"PageUp",
	"PageDown",
	"Escape",
	"F1",
	"F2",
	"F3",
	"F4",
	"F5",
	"F6",
	"F7",
	"F8",
	"F9",
	"F10",
	"F11",
	"F12",
]);

interface UseGuacamoleKeyboardProps {
	clientRef: RefObject<Guacamole.Client | null>;
	containerRef: RefObject<HTMLDivElement | null>;
	isConnected: boolean;
}

export const useGuacamoleKeyboard = ({
	clientRef,
	containerRef,
	isConnected,
}: UseGuacamoleKeyboardProps) => {
	useEffect(() => {
		const container = containerRef.current;
		if (!container || !isConnected) return;

		const keyboard = new Guacamole.Keyboard(container);

		keyboard.onkeydown = (keysym) => {
			if (clientRef.current) {
				clientRef.current.sendKeyEvent(1, keysym);
			}
		};

		keyboard.onkeyup = (keysym) => {
			if (clientRef.current) {
				clientRef.current.sendKeyEvent(0, keysym);
			}
		};

		// Prevent the browser from consuming key combos (Ctrl+W, Ctrl+Arrow, Alt+F4…)
		// and non-printable keys (arrows scrolling the page, Backspace navigating back).
		const suppressBrowserShortcuts = (e: KeyboardEvent) => {
			if (e.ctrlKey || e.altKey || e.metaKey || NON_PRINTABLE_KEYS.has(e.key)) {
				e.preventDefault();
			}
		};

		// Release all held keysyms when the window loses focus so the remote doesn't
		// end up with stuck modifier keys (e.g. when Ctrl+Shift+C opens DevTools).
		const handleWindowBlur = () => {
			keyboard.reset();
		};

		container.addEventListener("keydown", suppressBrowserShortcuts, {
			capture: true,
		});
		window.addEventListener("blur", handleWindowBlur);

		return () => {
			keyboard.onkeydown = null;
			keyboard.onkeyup = null;
			container.removeEventListener("keydown", suppressBrowserShortcuts, {
				capture: true,
			});
			window.removeEventListener("blur", handleWindowBlur);
		};
	}, [clientRef, containerRef, isConnected]);
};
