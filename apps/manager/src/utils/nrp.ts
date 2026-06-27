import type { DegreeLevel } from "@vlab/shared/enums";

export interface ParsedNRP {
	year: number;
	degreeLevel: DegreeLevel;
	programName: string;
	programCode: string;
}

export function parseNRP(nrp: string): ParsedNRP | null {
	const match = nrp.match(/^(\d{2})(\d{2})(\d{2})(\d{4})$/);
	if (!match) return null;

	const [, PP, YY, TT] = match;
	const yearPart = parseInt(YY, 10);
	if (yearPart < 20) return null;

	const year = 2000 + yearPart;

	const trackMap: Record<string, { degree: DegreeLevel; mode: string }> = {
		"50": { degree: "D3", mode: "regular" },
		"60": { degree: "D4", mode: "regular" },
		"51": { degree: "D3", mode: "PJJ" },
		"61": { degree: "D4", mode: "PJJ" },
		"52": { degree: "D3", mode: "PSDKU" },
		"64": { degree: "LJ", mode: "LJ" },
	};

	const confirmedProgramMap: Record<string, string> = {
		"21": "Teknik Elektronika",
		"22": "Teknik Telekomunikasi",
		"23": "Teknik Elektro Industri",
		"24": "Teknik Rekayasa Internet",
		"31": "Teknik Informatika",
		"32": "Teknik Komputer",
		"33": "Sains Data Terapan",
		"41": "Teknik Mekatronika",
		"42": "Sistem Pembangkit Energi",
		"51": "Teknologi Multimedia Broadcasting",
		"52": "Teknologi Game",
		"53": "Teknologi Rekayasa Multimedia",
	};

	const probableProgramMap: Record<string, string> = {
		"25": "Teknologi Rekayasa Keselamatan K3",
		"43": "Teknologi Rekayasa Perancangan Manufaktur",
		"54": "Bisnis Digital",
	};

	const degreeInfo = trackMap[TT] || { degree: "D4", mode: "unspecified" };
	const programName =
		confirmedProgramMap[PP] || probableProgramMap[PP] || "Unknown";

	return {
		year,
		degreeLevel: degreeInfo.degree,
		programName,
		programCode: PP,
	};
}
