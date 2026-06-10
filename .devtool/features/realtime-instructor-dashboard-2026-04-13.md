---
id: "realtime-instructor-dashboard-2026-04-13"
status: "todo"
priority: "medium"
assignee: null
dueDate: null
created: "2026-04-13T03:29:24.035Z"
modified: "2026-06-11T05:22:00.000Z"
completedAt: null
labels: ["frontend", "websocket", "instructor"]
order: "a7"
---

# Realtime Instructor Dashboard

Implement real-time monitoring of student lab sessions for instructors.
Instructors should be able to see the live progress of students taking their labs, receive instant updates on evaluation success/failures via Waycast WebSockets, and track overall class completion status without needing to refresh the page.

## Acceptance Criteria

- [ ] Connect instructor dashboard to the `evaluation` WebSocket stream.
- [ ] Render a live student progress matrix or list.
- [ ] Display instant notifications when a student completes a critical evaluation check.
- [ ] Optimize the UI to handle concurrent updates from multiple student sessions.