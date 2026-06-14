---
id: "cli-introduction-lab-evaluation-checks-2026-06-11"
status: "done"
priority: "medium"
assignee: null
epic: null
dueDate: null
created: "2026-06-11T05:22:00.000Z"
modified: "2026-06-14T06:01:38.183Z"
completedAt: "2026-06-14T06:01:38.183Z"
labels: ["evaluation", "cli"]
order: "Zt"
---
# CLI Introduction Lab Evaluation Checks

Implement evaluation checks specifically for the "CLI Introduction" lab.
This requires the evaluator engine to be capable of interacting with the container nodes to check filesystem states and command execution histories.

## Acceptance Criteria

- [ ] Evaluator can verify if specific files have been created in a node (e.g., checking file existence, permissions, and contents).
- [ ] Evaluator can check if specific commands have been executed (e.g., checking `.bash_history` or command logs).
- [ ] Add CLI introduction lab examples with these evaluation criteria to the database.