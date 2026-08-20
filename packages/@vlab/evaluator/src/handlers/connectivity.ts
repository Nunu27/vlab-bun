import { PassThrough } from "node:stream";
import { Type as t } from "@sinclair/typebox";
import type { Container } from "dockerode";
import { EvaluationHandler } from "../base/evaluation-handler";
import { getModem, throttle } from "../utils";

/**
 * Reachability from this node, keyed by the target that was probed.
 *
 * Unlike a routing table, reachability is not enumerable — there is no "list
 * of everything reachable" to read. The source therefore probes exactly the
 * targets its checks ask about, which the session supplies as `checkParams`.
 */
export const ReachabilitySchema = t.Record(t.String(), t.Boolean());

// One echo, one second. Bounded so a read can never stall a check cycle, and
// cheap enough to repeat whenever the lab's state changes.
const PING_COUNT = 1;
const PING_TIMEOUT_SECONDS = 1;

// Convergence produces bursts of route events across several routers. Probing
// on the leading edge keeps the check responsive; the trailing edge catches
// the state the burst settled into.
const REPROBE_WINDOW_MS = 2_000;

export function parsePingSuccess(output: string): boolean {
	// Match the receive count rather than looking for "0% packet loss", which
	// some ping builds omit when the host is unreachable.
	const received = output.match(/(\d+)\s+(?:packets\s+)?received/);
	if (received?.[1]) return Number.parseInt(received[1], 10) > 0;
	return false;
}

export function uniqueTargets(checkParams: { target: string }[]): string[] {
	const targets = new Set<string>();
	for (const { target } of checkParams) {
		if (target) targets.add(target);
	}
	return [...targets];
}

async function execCapture(container: Container, cmd: string[]) {
	const exec = await container.exec({
		Cmd: cmd,
		AttachStdout: true,
		AttachStderr: true,
		Tty: false,
	});

	const stream = await exec.start({ Detach: false, Tty: false });

	const stdout = new PassThrough();
	const stderr = new PassThrough();
	getModem(container).demuxStream(stream, stdout, stderr);

	let output = "";
	stdout.on("data", (chunk: Buffer) => {
		output += chunk.toString();
	});
	stderr.on("data", (chunk: Buffer) => {
		output += chunk.toString();
	});

	await new Promise<void>((resolve, reject) => {
		stream.on("end", resolve);
		stream.on("error", reject);
		stream.resume();
	});

	return output;
}

async function probe(
	container: Container,
	targets: string[],
): Promise<typeof ReachabilitySchema.static> {
	const results: Record<string, boolean> = {};

	// Sequential: probes are short, and a lab node running many pings at once
	// would distort the very thing being measured.
	for (const target of targets) {
		try {
			const output = await execCapture(container, [
				"ping",
				"-c",
				String(PING_COUNT),
				"-W",
				String(PING_TIMEOUT_SECONDS),
				target,
			]);
			results[target] = parsePingSuccess(output);
		} catch (error) {
			if (
				error instanceof Error &&
				"statusCode" in error &&
				typeof error.statusCode === "number" &&
				[404, 409].includes(error.statusCode)
			) {
				// Container gone or restarting; report unreachable rather than
				// tearing the source down.
				results[target] = false;
				continue;
			}
			throw error;
		}
	}

	return results;
}

export default new EvaluationHandler("connectivity")
	.kinds(["linux"])
	.withContext(async ({ node, docker }) => {
		const container = docker.getContainer(node.id);
		return { container };
	})
	.addSource({
		id: "reachability",
		data: ReachabilitySchema,
		checkParams: {
			target: t.String({ title: "Target" }),
		},
		read: async ({ container }, checkParams) => {
			return await probe(container, uniqueTargets(checkParams));
		},
		listen: async (
			{ container },
			{ notify, subscribeAny, checkParams, reportError },
		) => {
			const targets = uniqueTargets(checkParams);
			if (targets.length === 0) return () => {};

			let stopped = false;

			const reprobe = throttle(async () => {
				if (stopped) return;
				try {
					notify(await probe(container, targets));
				} catch (error) {
					reportError(error);
				}
			}, REPROBE_WINDOW_MS);

			// Reachability has no event of its own: nothing in the kernel fires
			// when a multi-hop path starts working. Instead, re-probe whenever any
			// other source in the lab emits — a router installing a route, an
			// interface gaining an address. Those are exactly the changes that can
			// make a target reachable, and the session is already streaming them
			// for other checks, so this stays event-driven with no timer.
			const unsubscribe = subscribeAny(() => {
				void reprobe();
			});

			// Establish a baseline; later probes are driven by the events above.
			void reprobe();

			return () => {
				stopped = true;
				unsubscribe();
			};
		},
	})
	.addCheck({
		id: "ping",
		name: "Ping Reachable",
		text: "{target} should be reachable",
		source: "reachability",
		params: {
			target: t.String({
				title: "Target",
				description: "IP address to ping from this node",
			}),
		},
		handler: (_, params, data) => data[params.target] === true,
	});
