import type { DevtoolsSubscriptionInfo } from "../../../base/devtools-observer";
import { styles } from "../styles";

export function SubscriptionsList({
	activeSubscriptions,
}: {
	activeSubscriptions: DevtoolsSubscriptionInfo[];
}) {
	return (
		<div style={styles.subscriptionPanel}>
			{activeSubscriptions.length === 0 ? (
				<div style={styles.emptyState}>No active subscriptions.</div>
			) : (
				activeSubscriptions.map((sub) => (
					<div
						key={sub.topic}
						style={{
							...styles.subscriptionItem,
							display: "flex",
							flexDirection: "column",
							gap: "8px",
						}}
					>
						<div
							style={{
								fontWeight: 600,
								color: "#fff",
								display: "flex",
								justifyContent: "space-between",
							}}
						>
							<span>{sub.topic}</span>
							<span
								style={{
									color: "#aaa",
									fontSize: "12px",
									fontWeight: "normal",
								}}
							>
								Created: {new Date(sub.createdAt).toLocaleTimeString()}
							</span>
						</div>
						{sub.lastDataAt && (
							<div style={{ fontSize: "12px", color: "#aaa" }}>
								Last Data: {new Date(sub.lastDataAt).toLocaleTimeString()}
							</div>
						)}
						{sub.lastData !== undefined && (
							<div
								style={{
									padding: "8px",
									backgroundColor: "#1a1a1a",
									border: "1px solid #333",
									borderRadius: "4px",
									overflowX: "auto",
									maxHeight: "200px",
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
									{JSON.stringify(sub.lastData, null, 2)}
								</pre>
							</div>
						)}
					</div>
				))
			)}
		</div>
	);
}
