import Guacamole from "guacamole-common-js";
import { type RefObject, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

interface UseGuacamoleClipboardProps {
	clientRef: RefObject<Guacamole.Client | null>;
	isConnected: boolean;
}

/**
 * Returns true only when the browser supports clipboard-read via the
 * Permissions API (Chromium-based browsers).
 *
 * Firefox and Safari do not expose "clipboard-read" in the Permissions API
 * and restrict readText() to direct user-gesture handlers — calling it from
 * focus/visibilitychange events is silently rejected with no permission prompt.
 */
const isClipboardReadSupported = async (): Promise<boolean> => {
	if (!navigator.clipboard?.readText) return false;
	try {
		const result = await navigator.permissions.query({
			name: "clipboard-read" as PermissionName,
		});
		return result.state === "granted" || result.state === "prompt";
	} catch {
		// Permissions API doesn't recognise "clipboard-read" — Firefox / Safari
		return false;
	}
};

export const useGuacamoleClipboard = ({
	clientRef,
	isConnected,
}: UseGuacamoleClipboardProps) => {
	// Tracks the last text we pushed to the remote so we don't echo it back
	// when the focus handler reads the local clipboard.
	const lastSentRef = useRef<string>("");
	// Shown at most once per session to avoid repeated toasts.
	const noticeShownRef = useRef(false);

	const sendClipboardText = useCallback(
		(text: string) => {
			const client = clientRef.current;
			if (!text || !client) return;

			lastSentRef.current = text;
			const stream = client.createClipboardStream("text/plain");
			const writer = new Guacamole.StringWriter(stream);
			for (let i = 0; i < text.length; i += 4096) {
				writer.sendText(text.slice(i, i + 4096));
			}
			writer.sendEnd();
		},
		[clientRef],
	);

	// Receive clipboard data from the remote and write it to the local clipboard.
	// isConnected is a dependency so this effect re-runs after connection is
	// established — clientRef.current is null at mount time.
	useEffect(() => {
		const client = clientRef.current;
		if (!client || !isConnected) return;

		const handleClipboard = (
			stream: Guacamole.InputStream,
			mimetype: string,
		) => {
			if (/^text\//.test(mimetype)) {
				const reader = new Guacamole.StringReader(stream);
				let data = "";
				reader.ontext = (text) => {
					data += text;
				};
				reader.onend = () => {
					// Update lastSent so the focus handler doesn't echo this back.
					lastSentRef.current = data;
					navigator.clipboard.writeText(data).catch((err) => {
						console.error("Failed to write to clipboard:", err);
					});
				};
			}
		};

		client.onclipboard = handleClipboard;

		return () => {
			client.onclipboard = null;
		};
	}, [clientRef, isConnected]);

	// Sync clipboard from outside the browser when the window regains focus or
	// becomes visible. This relies on the clipboard-read Permissions API which
	// is only available in Chromium-based browsers.
	//
	// Firefox and Safari reject readText() in focus/visibilitychange handlers
	// without showing a permission prompt, so we detect support first and fall
	// back to a one-time informational toast on those browsers.
	useEffect(() => {
		if (!isConnected) return;

		let cancelled = false;
		let cleanup: (() => void) | undefined;

		isClipboardReadSupported().then((supported) => {
			if (cancelled) return;

			if (supported) {
				const syncFromExternalClipboard = async () => {
					try {
						const text = await navigator.clipboard.readText();
						if (text && text !== lastSentRef.current) {
							sendClipboardText(text);
						}
					} catch (err) {
						console.error("Clipboard read failed:", err);
					}
				};

				const handleFocus = () => syncFromExternalClipboard();
				const handleVisibilityChange = () => {
					if (document.visibilityState === "visible") {
						syncFromExternalClipboard();
					}
				};

				window.addEventListener("focus", handleFocus);
				document.addEventListener("visibilitychange", handleVisibilityChange);

				cleanup = () => {
					window.removeEventListener("focus", handleFocus);
					document.removeEventListener(
						"visibilitychange",
						handleVisibilityChange,
					);
				};
			} else {
				// Firefox / Safari: auto-sync on focus is not available.
				// Show a one-time notice so the user knows to use Ctrl+V.
				if (!noticeShownRef.current) {
					noticeShownRef.current = true;
					toast.info(
						"Clipboard auto-sync is not supported in this browser. Use Ctrl+V to paste into the remote session.",
						{
							id: "guac-clip-no-support",
							duration: 8000,
							position: "top-right",
						},
					);
				}
			}
		});

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, [isConnected, sendClipboardText]);

	// Explicit paste (Ctrl+V) — forward clipboard data to the remote.
	// Works in all browsers regardless of clipboard-read permission support.
	useEffect(() => {
		const handlePaste = (e: ClipboardEvent) => {
			const text = e.clipboardData?.getData("text/plain");
			if (text) {
				sendClipboardText(text);
			}
		};

		window.addEventListener("paste", handlePaste);

		return () => {
			window.removeEventListener("paste", handlePaste);
		};
	}, [sendClipboardText]);
};
