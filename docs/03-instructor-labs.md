# Instructor Operations & Lab Generation

Instructors hold the role of "Architect" within vLab. They use a unified, highly-visual creation wizard to compile assignments. A "Lab" is stored in the database as a singular entity encompassing topologies, instructions, and target student enrollments.

## Deep Dive: The Laboratory Construction Pipeline
An instructor completes a 4-step wizard housed in the `_dashboard/_instructor/my-lab/` routing segment to bring a lab to life.

### Phase 1: Context Definition (Overview & Attachments)
The instructor sets the objective limits. Crucially, they can upload supplemental material (Configurations, Packet Captures). These files map securely to vLab's internal file structures, exposing unique URLs the students download from later.

### Phase 2: Building The Topology Canvas
The canvas is built using `@dnd-kit/core` and SVG routing rendering.
1. The Instructor clicks **"Add Node"**. The system queries the API for available Administrative *Device Templates*.
2. The Instructor drops a **MikroTik Router** and a **Linux PC** onto the canvas.
3. The Instructor drags a connection from the Router's `eth1` point to the Linux PC's `eth0` point.
4. *Data State*: The frontend saves this JSON graph (Node IDs, specific X/Y coordinate visualization placements, and the strictly locked interface links). 

### Phase 3: Instructions & The Rubric Engine
Using the Markdown editor, the instructor writes out the step-by-step tutorial. 
Next, they must define how the system knows the student succeeded. They map logical checks (referred to as "Evaluators") to instructions.

For Example: State Check
- **Target Node**: The *MikroTik Router* dropped earlier.
- **Goal Condition**: "Routing table must contain route 10.0.0.0/8"

When saved, this specific objective is injected into the database and tagged as a pending dependency awaiting the Evaluator Engine.

### Phase 4: Enrollment Enforcement
Labs are useless without target participants. Instructors pick specific *Study Programs*. Because the backend utilizes Drizzle ORM, triggering an enrollment generates specific `lab_session` permission rows in the database granting hundreds of students access to the newly built infrastructure simultaneously.
