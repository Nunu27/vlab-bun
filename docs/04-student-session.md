# The Student Workspace Experience

The student workflow revolves entirely around "Sessions". Once an Instructor has prepared a Lab, it sits dormant until a Student explicitly requests computing resources to practice. 

## Deep Dive: Managing Concurrency & Conflicts
Network virtualizations using strict Docker memory limits still consume vast resources across host clusters. Because of this, vLab mandates a strict "One Active Session Per Student" rule.

**The Conflict Event Flow**: 
When a Student initiates a WebSocket handshake (`lab-session:[sessionId]:connect`), the router verifies their `clientId` against the PostgreSQL database. If there is already an active socket bound to their session elsewhere, the API gracefully emits a `conflict` flag. A UI modal then prompts the student to evict the stale socket and forcibly overtake control of the running session, enforcing strict 1:1 concurrency.

## Deep Dive: Entering the Workspace Interface
Located structurally under `_dashboard/_student/lab/$labId/session/$labSessionId`, the Session Workspace is heavily compartmentalized. It consists of the live Topology diagram in the center, flanked by sidebars containing the Markdown instructional document and the dynamically updating Score Indicator.

### Direct Node Access (The Guacamole Token Engine)
To actually "do" the lab, a student must interface with the virtualized operating systems of the Nodes (like a Router CLI or a Linux prompt).

Instead of making the student configure a VPN or local SSH tool, vLab provides an instant in-browser terminal through **Apache Guacamole**. Here is how it functions technically:

1. **The Request**: The student clicks on a node in the graphic Topology Canvas, triggering a `[GET]` request to `/lab/session/node/:id`.
2. **Data Extraction**: The `node.ts` route queries the core Database for that specific container's Management IP (`ip` populated during boot) and pairs it with the node's underlying Device Template.
3. **Protocol Enforcement**: The template dictates the acceptable protocol (`ssh`, `telnet`, `vnc`, or `rdp`) and the exact container listening `port`, `username`, and `password`.
4. **Tokenization**: The data is piped into `guacamole.generateToken()`, utilizing AES-256-CBC encryption via the `GUACD_SECRET` to mint an inviolable payload payload without ever exposing passwords to the frontend.
5. **Session Connection**: The React UI absorbs this token and instantiates the `guacamole-lite` client interface, bridging the websocket exclusively to the Docker management IP. 
6. **Container Routing Fix**: (Specifically for Linux nodes), vLab's deployment engine injects a `startupExecs` parameter mapping `ip route add [GUACD_IP] dev eth0`, explicitly drawing a dedicated network pathway for the Guacamole Daemon so the SSH proxies correctly respond.
