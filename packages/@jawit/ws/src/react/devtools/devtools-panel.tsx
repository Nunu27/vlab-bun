import { useMemo, useState, useSyncExternalStore } from "react";
import type SocketIOClient from "../../adapter/socket.io/client";
import { LogList } from "./components/log-list";
import { SubscriptionsList } from "./components/subscriptions-list";
import { type TabType, Toolbar } from "./components/toolbar";
import { getDevtoolsStore } from "./store";
import { styles } from "./styles";

export function JawitWSDevtoolsPanel({
	client,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: generic
	client: SocketIOClient<any>;
}) {
	const store = useMemo(() => getDevtoolsStore(client), [client]);
	const logs = useSyncExternalStore(store.subscribe, () => store.logs);

	// useSyncExternalStore is tearing-safe in concurrent mode.
	// getSnapshot MUST return a stable (cached) reference — a new object/array
	// every call causes an infinite "always changed" loop.
	const isConnected = useSyncExternalStore(
		useMemo(
			() => (cb: () => void) => client.subscribeConnectionState(cb),
			[client],
		),
		() => client.isConnected,
	);

	const activeSubscriptions = useSyncExternalStore(
		useMemo(
			() => (cb: () => void) => store.observer.subscribeSubscriptions(cb),
			[store],
		),
		// Returns the cached array reference — only replaced when subscriptions actually change.
		() => store.observer.getSubscriptionSnapshot(),
	);

	const [activeTab, setActiveTab] = useState<TabType>("logs");

	return (
		<div style={styles.root}>
			<Toolbar
				isConnected={isConnected}
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				onClear={() => store.clear()}
			/>

			<div style={styles.content}>
				{activeTab === "logs" && <LogList logs={logs} />}
				{activeTab === "subscriptions" && (
					<SubscriptionsList activeSubscriptions={activeSubscriptions} />
				)}
			</div>
		</div>
	);
}
