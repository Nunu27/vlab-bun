import { useMemo, useState } from "react";
import type { DevLog } from "../store";
import { styles } from "../styles";
import { LogItem } from "./log-item";

export type FilterType = "all" | "incoming" | "outgoing";

export function LogList({ logs }: { logs: DevLog[] }) {
	const [filterType, setFilterType] = useState<FilterType>("all");

	const filteredLogs = useMemo(
		() =>
			filterType === "all" ? logs : logs.filter((l) => l.type === filterType),
		[logs, filterType],
	);

	return (
		<>
			<div style={styles.filterBar}>
				<select
					value={filterType}
					onChange={(e) =>
						setFilterType(
							(e.target as unknown as { value: string }).value as FilterType,
						)
					}
					style={styles.filterSelect}
				>
					<option value="all">All Events</option>
					<option value="incoming">Incoming (⬇)</option>
					<option value="outgoing">Outgoing (⬆)</option>
				</select>
			</div>

			<div style={styles.logList}>
				{filteredLogs.map((log) => (
					<LogItem key={log.id} log={log} />
				))}
				{filteredLogs.length === 0 && (
					<div style={styles.emptyState}>No logs recorded yet.</div>
				)}
			</div>
		</>
	);
}
