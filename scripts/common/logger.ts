import colors from "./colors";

/**
 * Displays a prominent, padded banner box. Good for script startups.
 */
export const banner = (text: string): void => {
	const padding = 3;
	const content = ` ${text} `;
	const border = "═".repeat(content.length + padding * 2);
	const emptyLine = `║${" ".repeat(content.length + padding * 2)}║`;

	console.log(`\n${colors.cyan}${colors.bold}╔${border}╗`);
	console.log(emptyLine);
	console.log(`║${" ".repeat(padding)}${content}${" ".repeat(padding)}║`);
	console.log(emptyLine);
	console.log(`╚${border}╝${colors.reset}\n`);
};

/**
 * Displays a section header to cleanly separate different parts of your script.
 */
export const section = (title: string): void => {
	const prefix = "═══";
	const dashCount = Math.max(0, 50 - title.length - prefix.length - 2);
	const suffix = "═".repeat(dashCount);

	console.log(
		`\n${colors.blue}${colors.bold}${prefix} ${title} ${suffix}${colors.reset}\n`,
	);
};

/**
 * Standard log output without special formatting.
 */
export const log = (message: unknown, ...args: unknown[]): void => {
	console.log(message, ...args);
};

/**
 * Informational output with a cyan [INFO] tag.
 */
export const info = (message: unknown, ...args: unknown[]): void => {
	console.info(
		`${colors.cyan}${colors.bold}ℹ INFO:   ${colors.reset}`,
		message,
		...args,
	);
};

/**
 * Success output with a green [SUCCESS] tag.
 */
export const success = (message: unknown, ...args: unknown[]): void => {
	console.info(
		`${colors.green}${colors.bold}✔ SUCCESS:${colors.reset}`,
		message,
		...args,
	);
};

/**
 * Warning output with a yellow [WARN] tag.
 */
export const warn = (message: unknown, ...args: unknown[]): void => {
	console.warn(
		`${colors.yellow}${colors.bold}⚠ WARN:   ${colors.reset}`,
		message,
		...args,
	);
};

/**
 * Error output with a red [ERROR] tag.
 */
export const error = (message: unknown, ...args: unknown[]): void => {
	console.error(
		`${colors.red}${colors.bold}✖ ERROR:  ${colors.reset}`,
		message,
		...args,
	);
};

// Provide a default export for backward compatibility or object-style usage
export default {
	banner,
	section,
	log,
	info,
	success,
	warn,
	error,
};
