---
id: "implement-actual-telemetry-gathering-2026-06-11"
status: "done"
priority: "medium"
assignee: null
epic: null
dueDate: null
created: "2026-06-11T05:51:00.000Z"
modified: "2026-06-10T23:04:00.000Z"
completedAt: "2026-06-10T23:04:00.000Z"
labels: ["worker", "telemetry"]
order: "aA"
---
# Implement Actual Telemetry Gathering

The worker currently sends placeholder/mocked metrics for its system telemetry. This needs to be replaced with actual system metrics gathering logic.

## Acceptance Criteria

- [x] Replaces `storageMb: 100000` with actual storage capacity in `workerSpec` payload (`createReplyStream`).
- [x] Replaces `Math.random() * 20` and `Math.random() * 40` with actual CPU and Memory usage percentages in `sendMetrics` payload (`streamMetrics`).
- [x] Replaces hardcoded values for `storageUsagePercent`, `activeLabs`, `activeNodes`, and `score` with actual dynamic values.
- [x] Uses appropriate libraries (e.g., `node:os`) or system utilities to gather hardware telemetry.
- [x] Incorporates Docker queries to accurately report running labs and node counts.