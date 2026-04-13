import { styleFactories, styles } from "../styles";

export type TabType = "logs" | "subscriptions";

export function Toolbar({
	isConnected,
	activeTab,
	setActiveTab,
	onClear,
}: {
	isConnected: boolean;
	activeTab: TabType;
	setActiveTab: (tab: TabType) => void;
	onClear: () => void;
}) {
	return (
		<div style={styles.toolbar}>
			<div style={styles.toolbarLeft}>
				<span style={styles.statusLabel}>
					<div style={styleFactories.statusDot(isConnected)} />
					{isConnected ? "Connected" : "Disconnected"}
				</span>

				<div style={styles.tabBar}>
					{(["logs", "subscriptions"] as const).map((tab) => (
						<button
							key={tab}
							type="button"
							onClick={() => setActiveTab(tab)}
							style={styleFactories.tab(activeTab === tab)}
						>
							{tab}
						</button>
					))}
				</div>
			</div>

			<button type="button" onClick={onClear} style={styles.clearBtn}>
				Clear Logs
			</button>
		</div>
	);
}
