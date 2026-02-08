import Guacamole from "guacamole-common-js";
import { type RefObject, useCallback, useEffect } from "react";

interface UseGuacamoleClipboardProps {
	clientRef: RefObject<Guacamole.Client | null>;
	isConnected: boolean;
}

export const useGuacamoleClipboard = ({
	clientRef,
	isConnected,
}: UseGuacamoleClipboardProps) => {
	const sendClipboardText = useCallback(
		(text: string) => {
			const client = clientRef.current;
			if (!text || !client) return;

			const stream = client.createClipboardStream("text/plain");
			const writer = new Guacamole.StringWriter(stream);
			for (let i = 0; i < text.length; i += 4096) {
				writer.sendText(text.slice(i, i + 4096));
			}
			writer.sendEnd();
		},
		[clientRef],
	);

	// Setup clipboard receiving from remote
	useEffect(() => {
		const client = clientRef.current;
		if (!client) return;

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
					navigator.clipboard.writeText(data).catch((err) => {
						console.error("Failed to write to clipboard:", err);
					});
				};
			}
		};

		client.onclipboard = handleClipboard;

		return () => {
			if (client) {
				client.onclipboard = null;
			}
		};
	}, [clientRef]);

	// Setup clipboard events for sending to remote
	useEffect(() => {
		const handlePaste = (e: ClipboardEvent) => {
			const text = e.clipboardData?.getData("text/plain");
			if (text) {
				console.log("Sending clipboard data to remote:", text.length, "chars");
				sendClipboardText(text);
			}
		};

		const handleWindowFocus = () => {
			if (!isConnected || !clientRef.current) return;

			navigator.clipboard
				.readText()
				.then((text) => {
					if (text) {
						console.log("Syncing clipboard on focus:", text.length, "chars");
						sendClipboardText(text);
					}
				})
				.catch((err) => {
					console.debug("Clipboard read failed (focus sync):", err);
				});
		};

		window.addEventListener("paste", handlePaste);
		window.addEventListener("focus", handleWindowFocus);

		return () => {
			window.removeEventListener("paste", handlePaste);
			window.removeEventListener("focus", handleWindowFocus);
		};
	}, [clientRef, isConnected, sendClipboardText]);
};
