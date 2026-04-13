import { useState } from "react";
import type { DevLog } from "../store";

export function LogItem({ log }: { log: DevLog }) {
	const [expanded, setExpanded] = useState(false);
	const isIncoming = log.type === "incoming";
	const color = isIncoming ? "#3b82f6" : "#f59e0b";
	const icon = isIncoming ? "⬇" : "⬆";

	const toggle = () => setExpanded((v) => !v);

	return (
		<div style={{ borderBottom: "1px solid #333" }}>
			<div
				onClick={toggle}
				onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}
				style={{
					display: "flex",
					alignItems: "center",
					padding: "8px 12px",
					cursor: "pointer",
					backgroundColor: expanded ? "#262626" : "transparent",
				}}
			>
				<span style={{ color, marginRight: "8px", fontWeight: "bold" }}>
					{icon}
				</span>
				<span
					style={{
						color: "#aaa",
						marginRight: "12px",
						fontFamily: "monospace",
					}}
				>
					{new Date(log.timestamp).toLocaleTimeString()}
				</span>
				<span
					style={{
						fontWeight: 600,
						color: "#fff",
						fontFamily: "monospace",
						flex: 1,
					}}
				>
					{log.event}
				</span>
			</div>

			{expanded && (
				<div
					style={{
						padding: "12px",
						paddingLeft: "42px",
						backgroundColor: "#1a1a1a",
						borderTop: "1px solid #333",
					}}
				>
					<pre
						style={{
							margin: 0,
							fontFamily: "monospace",
							color: "#a78bfa",
							whiteSpace: "pre-wrap",
							wordBreak: "break-all",
						}}
					>
						{JSON.stringify(log.args, null, 2)}
					</pre>
				</div>
			)}
		</div>
	);
}
