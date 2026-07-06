import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import db from "@manager/db";
import { labAttachments, labEmbeddedFiles, labs } from "@manager/db/schema";
import baseLogger from "@manager/lib/logger";
import { uploadFile } from "@manager/lib/storage";
import type { LabChecksMap, LabTopology } from "@vlab/shared/schemas/lab";
import { $ } from "bun";
import { eq } from "drizzle-orm";

const logger = baseLogger.child({ service: "sync-modules" });

const DOCS_DIR = path.resolve(process.cwd(), "../../docs/modules");

const EMPTY_TOPOLOGY: LabTopology = {
	deviceCounts: {},
	devices: {},
	groups: {},
	notes: {},
	edges: {},
};

type TopologyMarkdownDevice = {
	template: string;
	x: number;
	y: number;
	credentials?: { username?: string; password?: string };
	resources?: { cpu?: number | null; memory?: string | null };
};

type TopologyMarkdownLink = {
	from: string;
	interface: string;
	to: string;
	remoteInterface: string;
};

type TopologyMarkdownGroup = {
	color: string;
	x: number;
	y: number;
	width: number;
	height: number;
	members: string[];
};

type TopologyMarkdownNote = {
	content: string;
	x: number;
	y: number;
};

type TopologyMarkdown = {
	devices: Record<string, TopologyMarkdownDevice>;
	links: TopologyMarkdownLink[];
	groups: Record<string, TopologyMarkdownGroup>;
	notes: TopologyMarkdownNote[];
};

function buildTopology(
	md: TopologyMarkdown,
	existingTopology: LabTopology,
	templateNameToId: Map<string, string>,
): LabTopology | null {
	const existingNodesByName = new Map<string, string>();
	for (const [nodeId, device] of Object.entries(existingTopology.devices)) {
		existingNodesByName.set(device.name, nodeId);
	}

	const deviceNameToId = new Map<string, string>();
	for (const name of Object.keys(md.devices)) {
		deviceNameToId.set(
			name,
			existingNodesByName.get(name) ?? crypto.randomUUID(),
		);
	}

	const existingEdgeByKey = new Map<string, string>();
	for (const [edgeId, [end1, end2]] of Object.entries(existingTopology.edges)) {
		const k1 = `${end1.deviceId}:${end1.interface}:${end2.deviceId}:${end2.interface}`;
		const k2 = `${end2.deviceId}:${end2.interface}:${end1.deviceId}:${end1.interface}`;
		existingEdgeByKey.set(k1, edgeId);
		existingEdgeByKey.set(k2, edgeId);
	}

	const edges: LabTopology["edges"] = {};
	const deviceEdges: Record<string, Record<string, string>> = {};

	for (const link of md.links) {
		const fromId = deviceNameToId.get(link.from);
		const toId = deviceNameToId.get(link.to);
		if (!fromId || !toId) {
			logger.warn(
				`Link references unknown device: "${link.from}" or "${link.to}"`,
			);
			continue;
		}
		const key = `${fromId}:${link.interface}:${toId}:${link.remoteInterface}`;
		const edgeId = existingEdgeByKey.get(key) ?? crypto.randomUUID();

		edges[edgeId] = [
			{ deviceId: fromId, interface: link.interface },
			{ deviceId: toId, interface: link.remoteInterface },
		];

		deviceEdges[fromId] ??= {};
		deviceEdges[fromId][edgeId] = link.interface;
		deviceEdges[toId] ??= {};
		deviceEdges[toId][edgeId] = link.remoteInterface;
	}

	const existingGroupsByName = new Map<string, string>();
	for (const [groupId, group] of Object.entries(existingTopology.groups)) {
		existingGroupsByName.set(group.name, groupId);
	}

	const groupNameToId = new Map<string, string>();
	for (const name of Object.keys(md.groups)) {
		groupNameToId.set(
			name,
			existingGroupsByName.get(name) ?? crypto.randomUUID(),
		);
	}

	const devices: LabTopology["devices"] = {};
	const deviceCounts: Record<string, number> = {};

	for (const [name, spec] of Object.entries(md.devices)) {
		const nodeId = deviceNameToId.get(name) ?? "";
		if (!nodeId) continue;
		const templateId = templateNameToId.get(spec.template);
		if (!templateId) {
			logger.warn(
				`Device template "${spec.template}" not found, skipping topology sync`,
			);
			return null;
		}

		deviceCounts[templateId] = (deviceCounts[templateId] ?? 0) + 1;

		const groupIds = Object.entries(md.groups)
			.filter(([, g]) => g.members.includes(name))
			.flatMap(([groupName]) => {
				const id = groupNameToId.get(groupName);
				return id ? [id] : [];
			});

		devices[nodeId] = {
			x: spec.x,
			y: spec.y,
			name,
			deviceId: templateId,
			groupIds,
			resources: spec.resources ?? {},
			...(spec.credentials ? { credentials: spec.credentials } : {}),
			edges: deviceEdges[nodeId] ?? {},
		};
	}

	const groups: LabTopology["groups"] = {};
	for (const [name, spec] of Object.entries(md.groups)) {
		const groupId = groupNameToId.get(name);
		if (!groupId) continue;
		groups[groupId] = {
			x: spec.x,
			y: spec.y,
			name,
			color: spec.color,
			width: spec.width,
			height: spec.height,
			members: spec.members.flatMap((m) => {
				const id = deviceNameToId.get(m);
				return id ? [id] : [];
			}),
		};
	}

	const existingNotesByKey = new Map<string, string>();
	for (const [noteId, note] of Object.entries(existingTopology.notes)) {
		existingNotesByKey.set(`${note.x}:${note.y}:${note.content}`, noteId);
	}

	const notes: LabTopology["notes"] = {};
	for (const note of md.notes) {
		const key = `${note.x}:${note.y}:${note.content}`;
		const noteId = existingNotesByKey.get(key) ?? crypto.randomUUID();
		notes[noteId] = { x: note.x, y: note.y, content: note.content };
	}

	return { deviceCounts, devices, groups, notes, edges };
}

export async function runSyncModules() {
	logger.info("Starting sync-modules...");

	try {
		logger.info("Generating material PDFs...");
		await $`bun run scripts/generate-materials-pdf.ts`
			.cwd(path.resolve(process.cwd(), "../../"))
			.quiet();
		logger.info("Material PDFs generated.");

		const modules = await fs.readdir(DOCS_DIR);

		const existingLabs = await db.query.labs.findMany();
		const allTemplates = await db.query.deviceTemplates.findMany();
		const templateNameToId = new Map(allTemplates.map((t) => [t.name, t.id]));

		for (const mod of modules) {
			const modPath = path.join(DOCS_DIR, mod);
			const stat = await fs.stat(modPath);
			if (!stat.isDirectory()) continue;

			logger.info(`Processing module: ${mod}`);

			const descPath = path.join(modPath, "description.md");
			const instPath = path.join(modPath, "instructions.md");
			const checksPath = path.join(modPath, "checks.md");

			let desc = "";
			let inst = "";
			let checksMd = "";

			try {
				desc = await fs.readFile(descPath, "utf-8");
			} catch (_e) {
				logger.warn(`No description.md found for ${mod}`);
			}
			try {
				inst = await fs.readFile(instPath, "utf-8");
			} catch (_e) {
				logger.warn(`No instructions.md found for ${mod}`);
			}
			try {
				checksMd = await fs.readFile(checksPath, "utf-8");
			} catch (_e) {
				logger.warn(`No checks.md found for ${mod}`);
			}

			const titleMatch = desc.match(/^#\s+(.+)$/m);
			let title = mod;
			if (titleMatch) {
				title = titleMatch[1].trim();
			}

			const lab = existingLabs.find((l) => l.name === title || l.name === mod);

			const pdfPath = path.resolve(
				process.cwd(),
				"../../out/materials",
				`${mod}.pdf`,
			);
			let attachmentFileName: string | null = null;
			try {
				const pdfBuffer = await fs.readFile(pdfPath);
				const fileObj = new File([new Uint8Array(pdfBuffer)], `${mod}.pdf`, {
					type: "application/pdf",
				});
				const res = await uploadFile(fileObj);
				attachmentFileName = res.name;
				logger.info(`Uploaded material PDF for ${mod}`);
			} catch (_e) {
				logger.warn(
					`No material PDF found for ${mod} at ${pdfPath} or failed to upload`,
				);
			}

			const existingTopology = (lab?.topology as LabTopology) ?? EMPTY_TOPOLOGY;
			const existingChecks = (lab?.checks as LabChecksMap) ?? {};

			// Extract and parse topology block from instructions.md
			// Format: <!-- topology\n{...json...}\n-->
			const topologyBlockMatch = inst.match(
				/^<!--\s*topology\n([\s\S]*?)\n-->/m,
			);
			let newTopology: LabTopology | undefined;
			let instWithoutTopology = inst;

			if (topologyBlockMatch) {
				try {
					const topologyMd = JSON.parse(
						topologyBlockMatch[1],
					) as TopologyMarkdown;
					const built = buildTopology(
						topologyMd,
						existingTopology,
						templateNameToId,
					);
					if (built) {
						newTopology = built;
						logger.info(`Parsed topology for lab "${title}"`);
					}
				} catch (e) {
					logger.warn({ e }, `Failed to parse topology block for ${mod}`);
				}
				// Strip topology comment from instructions stored in DB
				instWithoutTopology = inst
					.replace(/^<!--\s*topology\n[\s\S]*?\n-->\n?/m, "")
					.trimStart();
			} else {
				logger.warn(`No topology block found in instructions.md for ${mod}`);
			}

			const lines = checksMd.split("\n");
			const newChecks: LabChecksMap = {};
			const appendedCheckUuids: Array<{
				checkId: string;
				targetNode: string;
				uuid: string;
				used?: boolean;
			}> = [];

			// Use the updated topology for node lookups if available, else fall back to existing
			const topologyForChecks = newTopology ?? existingTopology;

			for (const line of lines) {
				const trimmed = line.trim();
				if (
					trimmed.startsWith("|") &&
					!trimmed.startsWith("| Check ID") &&
					!trimmed.startsWith("|---")
				) {
					const parts = trimmed
						.split("|")
						.map((p) => p.trim())
						.filter(Boolean);
					if (parts.length === 4) {
						const checkId = parts[0].replace(/`/g, "");
						const targetNode = parts[1].replace(/`/g, "");
						const paramsStr = parts[2];
						const weight = parseInt(parts[3], 10) || 1;

						const params: Record<string, string> = {};
						const paramParts = paramsStr
							.split(/<br>|,\s+/)
							.map((p) => p.trim());
						for (const p of paramParts) {
							if (!p.includes(":")) continue;
							const [k, ...v] = p.split(":");
							params[k.replace(/\*\*/g, "").trim()] = v.join(":").trim();
						}

						let targetNodeId = "";
						if (topologyForChecks?.devices) {
							for (const [nodeId, device] of Object.entries(
								topologyForChecks.devices,
							)) {
								if (device.name === targetNode) {
									targetNodeId = nodeId;
									break;
								}
							}
						}

						if (!targetNodeId) {
							logger.warn(
								`Target node "${targetNode}" not found in topology for lab "${title}"`,
							);
							continue;
						}

						let checkUuid = "";
						for (const [id, c] of Object.entries(existingChecks)) {
							if (c.nodeId === targetNodeId && c.checkId === checkId) {
								let paramsMatch = true;
								for (const [k, v] of Object.entries(params)) {
									if (c.params[k] !== v) {
										paramsMatch = false;
										break;
									}
								}
								if (paramsMatch) {
									checkUuid = id;
									break;
								}
							}
						}

						if (!checkUuid) {
							checkUuid = crypto.randomUUID();
						}

						newChecks[checkUuid] = {
							nodeId: targetNodeId,
							checkId,
							params,
							weight,
						};

						appendedCheckUuids.push({ checkId, targetNode, uuid: checkUuid });
					}
				}
			}

			let finalInst = instWithoutTopology;
			finalInst = finalInst.replace(
				/<LabCheck\s+node="([^"]+)"\s+id="([^"]+)"\s*\/>/g,
				(match, node, id) => {
					const check = appendedCheckUuids.find(
						(c) => !c.used && c.targetNode === node && c.checkId === id,
					);
					if (check) {
						check.used = true;
						return `<LabChecks value="${check.uuid}" />`;
					}
					logger.warn(
						`Could not find check matching node="${node}" id="${id}" in lab ${title}`,
					);
					return match;
				},
			);

			// Group adjacent LabChecks into a single one
			finalInst = finalInst.replace(
				/(?:<LabChecks\s+value="([^"]+)"\s*\/>[ \t]*)+/g,
				(match) => {
					const values = [...match.matchAll(/value="([^"]+)"/g)].map(
						(m) => m[1],
					);
					return `<LabChecks value="${values.join(",")}" />`;
				},
			);

			// Append any unused checks at the end so they aren't lost
			const unusedUuids = appendedCheckUuids
				.filter((c) => !c.used)
				.map((c) => c.uuid);
			if (unusedUuids.length > 0) {
				logger.warn(
					`Appending ${unusedUuids.length} unused checks to the end of ${title}`,
				);
				finalInst += `\n\n<LabChecks value="${unusedUuids.join(",")}" />\n`;
			}

			if (lab) {
				await db
					.update(labs)
					.set({
						content: desc,
						instructions: finalInst,
						checks: newChecks,
						...(newTopology ? { topology: newTopology } : {}),
					})
					.where(eq(labs.id, lab.id));

				logger.info(`Updated lab: ${title}`);

				await db
					.delete(labEmbeddedFiles)
					.where(eq(labEmbeddedFiles.labId, lab.id));

				if (attachmentFileName) {
					await db
						.delete(labAttachments)
						.where(eq(labAttachments.labId, lab.id));
					await db.insert(labAttachments).values({
						name: title,
						file: attachmentFileName,
						labId: lab.id,
					});
				}
			} else {
				// Insert new lab: requires a topology block and an existing instructor
				if (!newTopology) {
					logger.warn(`Skipping new lab "${title}": no topology block found`);
					continue;
				}

				const instructor = await db.query.instructors.findFirst();
				if (!instructor) {
					logger.warn(
						`Skipping new lab "${title}": no instructors found in DB`,
					);
					continue;
				}

				const now = new Date();
				const farFuture = new Date("2099-12-31");

				const [newLab] = await db
					.insert(labs)
					.values({
						name: title,
						content: desc,
						instructions: finalInst,
						checks: newChecks,
						topology: newTopology,
						instructorId: instructor.id,
						startAt: now,
						endAt: farFuture,
						isPublished: false,
						sessionDuration: 180,
					})
					.returning({ id: labs.id });

				logger.info(`Created new lab: ${title}`);

				if (attachmentFileName && newLab) {
					await db.insert(labAttachments).values({
						name: title,
						file: attachmentFileName,
						labId: newLab.id,
					});
				}
			}
		}

		logger.info("Sync complete!");
	} catch (error) {
		logger.error({ err: error }, "Sync failed");
		throw error;
	} finally {
		await db.$client.end();
	}
}
