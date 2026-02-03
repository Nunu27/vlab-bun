import { execute } from "./shell";

export interface ArchitectureInfo {
	raw: string;
	platform: string;
	isArm: boolean;
}

export async function detectArchitecture(): Promise<ArchitectureInfo> {
	const res = await execute("uname -m");
	const raw = res.stdout.toString().trim();

	const archMap: Record<string, string> = {
		x86_64: "linux/amd64",
		aarch64: "linux/arm64",
		arm64: "linux/arm64",
		armv7l: "linux/arm/v7",
	};

	const platform = archMap[raw] ?? "linux/amd64";
	const isArm = raw === "aarch64" || raw === "arm64" || raw === "armv7l";

	return { raw, platform, isArm };
}
