---
id: "lab-evaluation-rules-builder-ui-2026-06-11"
status: "done"
priority: "medium"
assignee: null
epic: null
dueDate: null
created: "2026-06-11T05:22:00.000Z"
modified: "2026-06-10T22:33:56.780Z"
completedAt: "2026-06-10T22:33:56.780Z"
labels: ["frontend", "ui"]
order: "a1V"
---
# Lab Evaluation Rules Builder UI

Create a user interface for instructors to define evaluation rules for their labs without writing raw JSON or code.
Currently, as we add more complex evaluation capabilities (BGP, CLI commands, file checks), we need an intuitive way for instructors to configure these checks when creating or editing a lab.

## Acceptance Criteria

- [ ] Add a visual rule builder in the Lab Creation/Edit form.
- [ ] Support selecting node, check type (ping, route, bgp, file, command), and expected values.
- [ ] Implement validation to ensure the evaluation rules match the backend schema.