import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import colors from "./colors";

export async function ask(
	question: string,
	defaultValue?: string,
): Promise<string> {
	const rl = readline.createInterface({ input, output });
	const hint =
		defaultValue !== undefined
			? ` ${colors.gray}[${defaultValue}]${colors.reset}`
			: "";
	const formattedQuestion = `${colors.cyan}${colors.bold}?${colors.reset} ${question}${hint} ${colors.gray}›${colors.reset} `;

	try {
		const answer = await rl.question(formattedQuestion);
		const trimmed = answer.trim();
		return trimmed !== "" ? trimmed : (defaultValue ?? "");
	} finally {
		rl.close();
	}
}

export async function confirm(
	question: string,
	defaultYes: boolean = true,
): Promise<boolean> {
	const rl = readline.createInterface({ input, output });
	const hint = defaultYes ? "[Y/n]" : "[y/N]";
	const formattedQuestion = `${colors.cyan}${colors.bold}?${colors.reset} ${question} ${colors.gray}${hint} ›${colors.reset} `;

	try {
		const answer = await rl.question(formattedQuestion);
		const normalized = answer.trim().toLowerCase();

		if (normalized === "y" || normalized === "yes") return true;
		if (normalized === "n" || normalized === "no") return false;

		return defaultYes;
	} finally {
		rl.close();
	}
}
