// Full-jitter exponential backoff: base * factor^attempt, capped, then a
// uniform random delay in [0, delay). Standard defense against thundering
// herds on reconnect/retry.
export function expBackoff(
	attempt: number,
	options: { base: number; factor: number; cap: number },
) {
	const { base, factor, cap } = options;
	const delay = Math.min(cap, base * factor ** attempt);
	return Math.random() * delay;
}
