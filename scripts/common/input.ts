import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { Writable } from "node:stream";
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

export async function askPassword(question: string): Promise<string> {
	let muted = false;

	const mutableStdout = new Writable({
		write(chunk, encoding, callback) {
			if (!muted) {
				output.write(chunk, encoding);
			}
			callback();
		},
	});

	const rl = readline.createInterface({
		input,
		output: mutableStdout,
		terminal: true,
	});

	const formattedQuestion = `${colors.cyan}${colors.bold}?${colors.reset} ${question} ${colors.gray}›${colors.reset} `;

	const answerPromise = rl.question(formattedQuestion);
	muted = true;
	const answer = await answerPromise;
	output.write("\n");
	rl.close();
	return answer.trim();
}
