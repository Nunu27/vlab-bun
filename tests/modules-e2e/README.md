# modules-e2e

Validates every module under `docs/modules` — statically, and by deploying the
real topology and running the module's documented solution against it.

## Suites

| Command | Needs Docker? | What it covers |
|---|---|---|
| `bun run test:docs` | no | `instructions.md` ↔ `checks.md` ↔ `solution.md` ↔ `material.md` consistency |
| `bun test` | yes | the above, plus deploying all six labs and running each solution |
| `MODULE=ospf bun run test:module` | yes | one module (substring match) |

`test:docs` is what CI runs first (`Module Docs Validation`), because it catches
authoring mistakes in under a second and gates the expensive suite.

One of its checks is that the "Referensi Perintah" tables embedded in
`instructions.md` still match `material.md`, which is their source. Students run
the lab from `instructions.md` in the session sidebar while `material.md` ships
as a separate PDF, so the tables are copied in to save the round trip. Fix a
failure by re-running `bun run scripts:sync-command-reference` — never by hand
editing the copy.

## How the e2e works

For each module it deploys the topology from the `<!-- topology -->` block in
`instructions.md`, executes the commands in `solution.md` in document order,
then asserts every row of `checks.md` passes through the real evaluator.

Executing `solution.md` — rather than synthesising device config from
`checks.md` — is deliberate: it exercises the same commands a student is given,
so a solution that drifts from the instructions or the checks fails here
instead of in front of a student. Verification commands (`print`, `ping`,
`show`) are parsed but skipped; assertions come from the evaluator.

The harness mirrors the Linux startup execs that the worker applies to real lab
sessions (`LINUX_STARTUP_EXECS` in `src/topology-builder.ts`). Keep that in step
with `buildStartupExecs()` in `apps/worker/src/domain/lab/topology.ts`, or the
tests will diverge from what students actually get.

## Running locally

Containerlab defaults its management network to `172.20.20.0/24`, which
collides with existing Docker networks on some machines. If `containerlab
deploy` fails with "Requested subnet(s) ... overlap an existing Docker network",
create a dedicated network once:

```bash
docker network create clab-mgmt \
  --subnet 172.30.30.0/24 --gateway 172.30.30.1 \
  --ipv6 --subnet 3fff:172:30:30::/64
```

then point the labs at it:

```bash
export VLAB_MGMT_NETWORK=clab-mgmt
export VLAB_MGMT_IPV4_SUBNET=172.30.30.0/24
export VLAB_MGMT_IPV6_SUBNET=3fff:172:30:30::/64
bun test
```

Pick a range that is free on your machine — `docker network inspect` each
existing network to check. With none of these variables set the topology omits
the `mgmt` block entirely and containerlab uses its own default, which is what
CI relies on.

Also required: `/dev/kvm` (the RouterOS nodes are VMs under vrnetlab), the
`ghcr.io/nunu27/vrnetlab/vr-routeros` and
`ghcr.io/nunu27/docker-remote-desktop:ssh-ubuntu-24.04` images, and membership
of `clab_admins`.
