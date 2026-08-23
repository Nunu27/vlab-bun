/**
 * Static validation of the module documentation under docs/modules.
 *
 * Pure parsing: no Docker, no containerlab, no evaluation session. This runs
 * in CI on every docs change so authoring mistakes surface immediately rather
 * than in the heavyweight module e2e suite (or, worse, in front of a student).
 *
 * The contract being enforced: the platform binds <LabCheck> tags in
 * instructions.md to checks.md rows *positionally*. Nothing in the app
 * validates that pairing, so reordering checks.md silently re-anchors the
 * inline indicators a student clicks on.
 */

import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import evaluator from "@vlab/evaluator";
import {
	buildCombinedReference,
	END,
	START,
} from "../../../scripts/sync-command-reference";
import { parseModule } from "./module-parser";
import { parseSolution, toRouterOSCall } from "./solution-parser";

// Resolved from this file rather than cwd so the suite runs identically
// whether invoked from tests/modules-e2e or from the repo root.
const DOCS_DIR = resolve(import.meta.dir, "../../../docs/modules");

const moduleDirs = readdirSync(DOCS_DIR, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort();

if (moduleDirs.length === 0) {
	throw new Error(`No module directories found in ${DOCS_DIR}`);
}

const registry = evaluator.getChecks();

const parsedModules = await Promise.all(
	moduleDirs.map((dir) => parseModule(join(DOCS_DIR, dir))),
);

for (const mod of parsedModules) {
	describe(`Module docs: ${mod.name}`, () => {
		it("anchors every check with a LabCheck tag, in the same order", () => {
			const fromChecks = mod.checks.map((c) => `${c.targetNode} ${c.checkId}`);
			const fromTags = mod.tags.map((t) => `${t.node} ${t.checkId}`);

			// Compared as whole sequences so a mismatch reports the full diff
			// rather than just the first offending index.
			expect(fromTags).toEqual(fromChecks);
		});

		it("references only check ids the evaluator implements", () => {
			const known = Object.keys(registry.checks);
			const unknown = [
				...mod.checks.map((c) => ({ id: c.checkId, where: "checks.md" })),
				...mod.tags.map((t) => ({
					id: t.checkId,
					where: `instructions.md:${t.line}`,
				})),
			].filter((entry) => !known.includes(entry.id));

			expect(unknown).toEqual([]);
		});

		it("references only nodes declared in the topology", () => {
			const devices = Object.keys(mod.topology.devices);
			const unknown = [
				...mod.checks.map((c) => ({ node: c.targetNode, where: "checks.md" })),
				...mod.tags.map((t) => ({
					node: t.node,
					where: `instructions.md:${t.line}`,
				})),
			].filter((entry) => !devices.includes(entry.node));

			expect(unknown).toEqual([]);
		});

		it("passes params that satisfy each check's declared schema", () => {
			const problems: string[] = [];

			for (const check of mod.checks) {
				const definition = registry.checks[check.checkId];
				if (!definition) continue; // reported by the check-id test

				const declared = Object.keys(definition.params.properties ?? {});
				const required = (definition.params.required ?? []) as string[];
				const supplied = Object.keys(check.params);

				for (const name of required) {
					if (!supplied.includes(name)) {
						problems.push(
							`${check.targetNode} ${check.checkId}: missing required param "${name}"`,
						);
					}
				}
				for (const name of supplied) {
					if (!declared.includes(name)) {
						problems.push(
							`${check.targetNode} ${check.checkId}: unknown param "${name}" (declared: ${declared.join(", ")})`,
						);
					}
				}
			}

			expect(problems).toEqual([]);
		});

		it("assigns every check a positive integer weight", () => {
			const bad = mod.checks
				.filter((c) => !Number.isInteger(c.weight) || c.weight < 1)
				.map((c) => `${c.targetNode} ${c.checkId}: weight=${c.weight}`);

			expect(bad).toEqual([]);
		});

		// questions.md is authored ahead of a future quiz feature and is not
		// surfaced anywhere yet, so nothing else would notice it drifting out of
		// step with its answer key.
		it("keeps questions.md and its answer key in step", () => {
			const questionsPath = join(DOCS_DIR, mod.name, "questions.md");
			if (!existsSync(questionsPath)) return;

			const questions = readFileSync(questionsPath, "utf-8")
				.split("\n")
				.filter((line) => /^\d+\. /.test(line)).length;

			const solution = readFileSync(
				join(DOCS_DIR, mod.name, "solution.md"),
				"utf-8",
			);
			const keyIndex = solution.indexOf("## Kunci Jawaban");
			const answers =
				keyIndex === -1
					? 0
					: solution
							.slice(keyIndex)
							.split("\n")
							.filter((line) => /^\d+\. /.test(line)).length;

			expect({ questions, answers }).toEqual({
				questions,
				answers: questions,
			});
			expect(questions).toBeGreaterThan(0);
		});

		it("mirrors the material's command reference in instructions.md", async () => {
			// A student runs the lab from instructions.md while the reference
			// tables live in the module's material file(s), which ship as
			// separate PDFs. The tables are copied in so both sit in one pane;
			// the material file(s) remain the source. Fix a failure here with:
			//   bun scripts/sync-command-reference.ts
			const reference = await buildCombinedReference(join(DOCS_DIR, mod.name));
			expect(reference).toBeString();

			const instructions = readFileSync(
				join(DOCS_DIR, mod.name, "instructions.md"),
				"utf-8",
			);
			const from = instructions.indexOf(START);
			const to = instructions.indexOf(END);
			expect(from).toBeGreaterThan(-1);
			expect(to).toBeGreaterThan(from);

			const embedded = instructions.slice(from + START.length, to).trim();
			expect(embedded).toBe(reference as string);
		});

		describe("solution.md", () => {
			const solution = parseSolution(
				readFileSync(join(DOCS_DIR, mod.name, "solution.md"), "utf-8"),
				Object.keys(mod.topology.devices),
			);
			const runnable = solution.commands.filter((c) => !c.readOnly);

			it("puts every configuration command under a node section", () => {
				expect(solution.orphans).toEqual([]);
			});

			it("labels every fence with a known language", () => {
				expect(solution.unknownFences).toEqual([]);
			});

			it("configures every device in the topology", () => {
				const configured = new Set(runnable.map((c) => c.node));
				const missing = Object.keys(mod.topology.devices).filter(
					(node) => !configured.has(node),
				);

				expect(missing).toEqual([]);
			});

			it("uses only RouterOS commands the runner can execute", () => {
				const failures: string[] = [];

				for (const command of runnable) {
					if (command.kind !== "routeros") continue;
					try {
						toRouterOSCall(command.raw);
					} catch (error) {
						failures.push(`L${command.line}: ${(error as Error).message}`);
					}
				}

				expect(failures).toEqual([]);
			});

			// The addressing table is the most frequently edited part of a module,
			// so a check-ip row with no matching command in solution.md is the
			// likeliest drift between the two files.
			it("assigns every IP that check-ip asserts", () => {
				const missing: string[] = [];

				for (const check of mod.checks) {
					if (check.checkId !== "node-interface.check-ip") continue;
					const { ip, interface: iface } = check.params;
					if (!ip || !iface) continue;

					const satisfied = runnable.some((command) => {
						if (command.node !== check.targetNode) return false;

						if (command.kind === "routeros") {
							const call = toRouterOSCall(command.raw);
							return (
								call.path === "/ip/address/add" &&
								call.params.address === ip &&
								call.params.interface === iface
							);
						}

						// e.g. "sudo ip addr add 192.168.10.2/24 dev eth1"
						return new RegExp(
							`\\bip\\s+addr\\s+add\\s+${ip.replace(/[.\\/]/g, "\\$&")}\\s+dev\\s+${iface}\\b`,
						).test(command.raw);
					});

					if (!satisfied) {
						missing.push(`${check.targetNode}: ${ip} on ${iface}`);
					}
				}

				expect(missing).toEqual([]);
			});
		});
	});
}
