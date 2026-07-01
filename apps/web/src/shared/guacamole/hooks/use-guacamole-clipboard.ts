import Guacamole from "guacamole-common-js";
import { type RefObject, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

interface UseGuacamoleClipboardProps {
	clientRef: RefObject<Guacamole.Client | null>;
	isConnected: boolean;
}

export const useGuacamoleClipboard = ({
	clientRef,
	isConnected,
}: UseGuacamoleClipboardProps) => {
	// Tracks the last text we pushed to the remote so we don't echo it back
	// when the focus handler reads the local clipboard.
	const lastSentRef = useRef<string>("");
	// Shown at most once per session to avoid repeated permission prompts.
	const permissionDeniedToastShownRef = useRef(false);

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
					navigator.clipboard
						.writeText(data)
						.then(() => {
							toast.info("Clipboard received from remote", {
								id: "guac-clip-remote",
								duration: 2000,
								position: "top-right",
							});
						})
						.catch((err) => {
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

	// Sync clipboard from outside the browser (other apps) when the window
	// regains focus or becomes visible. Requires the clipboard-read permission;
	// silently no-ops if denied — explicit Ctrl+V (paste event) still works.
	useEffect(() => {
		if (!isConnected) return;

		const syncFromExternalClipboard = async () => {
			try {
				const text = await navigator.clipboard.readText();
				if (text && text !== lastSentRef.current) {
					sendClipboardText(text);
					toast.info("Clipboard synced to remote", {
						id: "guac-clip-local",
						duration: 2000,
						position: "top-right",
					});
				}
			} catch {
				// Permission denied or clipboard API not available.
				if (!permissionDeniedToastShownRef.current) {
					permissionDeniedToastShownRef.current = true;
					toast.warning(
						"Grant clipboard read permission to enable auto-sync from other apps. Ctrl+V still works.",
						{ id: "guac-clip-perm", duration: 6000, position: "top-right" },
					);
				}
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

		return () => {
			window.removeEventListener("focus", handleFocus);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [isConnected, sendClipboardText]);

	// Explicit paste (Ctrl+V) — forward clipboard data to the remote.
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
