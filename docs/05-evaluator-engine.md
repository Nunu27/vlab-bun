# The Real-Time Evaluator Engine

The defining educational feature of vLab is its capacity to assess complex system configurations automatically without human intervention. This works via a highly optimized, completely asynchronous **Event-Driven Architecture.**

## The Factual Inner Workings
vLab emphatically **does not** utilize timed polling loops or periodic bash-script executions. Relying on polling across hundreds of containers would artificially inflate host CPU loads and introduce severe delays.

Instead, the `Evaluator Engine` leverages native Node.js Event Emitters and raw Docker Daemon data streams to provide instantaneous feedback.

### The Source of Truth: `clabMonitor`
The foundation of the engine begins in the `@vlab/clab-monitor`. 
When initialized, it executes `docker.getEvents()`, tapping directly into the Docker Daemon's persistent event stream. It passively registers and parses system events (like `create`, `die`, and container `health_status`). 

Simultaneously, `clabMonitor` continuously monitors interface statuses and management IPs, broadcasting these updates throughout the API via Node's internal `EventEmitter`.

### The Bridging Mechanism (`ws.ts`)
The true magic happens inside the WebSocket routing engine (`apps/api/src/routes/lab/session/ws.ts`). 
The WebSocket server has a permanent listener hooked into the `clabMonitor`:

```typescript
clabMonitor.emitter.on("interface-update", ({ id, interfaces }) => {
	for (const [iface, ips] of Object.entries(interfaces)) {
		// Pushes a dedicated validation event!
		evaluator.emit("node-interface.interface-ip", id, { interface: iface }, ips);
	}
});
```
When Docker notices an interface has updated (for example, a student correctly added `10.0.0.1` to `eth1`), Docker informs `clabMonitor`, and `clabMonitor` broadcasts it into `ws.ts`. 

`ws.ts` acts as the grand orchestrator, grabbing those updated IPs and aggressively firing `evaluator.emit()`.

### The State Handlers (`EvaluationSession`)
Inside `packages/@vlab/evaluator`, when an `EvaluationSession` is started for a student, it maps all their required Rubric checks (e.g., "Must assign exactly IP X").

1. The Session uses `this.evaluator.on(...)` to sit passively and listen exclusively to its specified node ID.
2. The exact millisecond `ws.ts` executes `evaluator.emit()`, the session wakes up.
3. It takes the newly dispatched IP array and passes it into its mathematical Handler (e.g., `data.includes(params.ip)`).
4. If the check resolves to `true` (success), the Evaluator Engine executes `.notifyChange(id, result)`.

### Dealing With Disconnects
A persistent challenge is node flap (where a node goes down momentarily). To combat race conditions, vLab delegates evaluators inside a `Debouncer` class. An evaluation teardown isn't executed instantly if a socket drops; a 30-second delay is issued, allowing the event engine to preserve state perfectly while students briefly disconnect, resulting in a flawless grading experience.
