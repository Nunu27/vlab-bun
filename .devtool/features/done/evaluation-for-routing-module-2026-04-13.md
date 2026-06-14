---
id: "evaluation-for-routing-module-2026-04-13"
status: "done"
priority: "medium"
assignee: null
epic: null
dueDate: null
created: "2026-04-13T03:29:39.890Z"
modified: "2026-06-14T06:01:33.488Z"
completedAt: "2026-06-14T06:01:33.488Z"
labels: ["evaluation", "bgp"]
order: "Zu"
---
# Evaluation for Routing Module

Implement evaluation checks for BGP routing protocol.
Since BGP is not fully implemented in the evaluator engine yet, this requires extending the core `@vlab/evaluator` package to support checking BGP peerings, route advertisements, and autonomous system configurations.

## Acceptance Criteria

- [ ] Evaluator engine supports reading BGP state from node namespaces.
- [ ] Ability to check if specific BGP neighbors are established.
- [ ] Ability to verify advertised prefixes.
- [ ] Add BGP checks to dynamic routing lab examples.