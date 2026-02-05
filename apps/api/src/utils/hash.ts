export function md5(data: string | object): string {
	const content = typeof data === "string" ? data : JSON.stringify(data);
	return new Bun.CryptoHasher("md5").update(content).digest("hex");
}
