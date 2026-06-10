---
id: "evaluator-system-test-coverage-2026-06-11"
status: "backlog"
priority: "low"
assignee: null
dueDate: null
created: "2026-06-11T05:22:00.000Z"
modified: "2026-06-11T05:22:00.000Z"
completedAt: null
labels: ["testing", "backend"]
order: "a1"
---

# Evaluator System Test Coverage

Implement comprehensive unit and integration tests for the `@vlab/evaluator` package.
Given that the evaluator system dictates the grading of student labs, it is critical to ensure it behaves correctly, especially as we add complex checks for BGP and CLI interactions.

## Acceptance Criteria

- [ ] Set up a testing framework (Vitest/Bun test) for the evaluator package.
- [ ] Write unit tests for the core evaluation debouncer and state management.
- [ ] Write integration tests simulating Docker namespace interactions for routing and CLI checks.
