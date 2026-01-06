import env from "@backend/env";
import type {
	GuacamoleProtocol,
	JoinConnectionSettings,
	KubernetesParameters,
	RDPParameters,
	SSHParameters,
	TelnetParameters,
	VNCParameters
} from "@backend/types/guacamole";
import type { BlobOrStringOrBuffer } from "bun";
import { createCipheriv, randomBytes } from "crypto";

export const md5 = (input: BlobOrStringOrBuffer) =>
	new Bun.CryptoHasher("md5").update(input).digest("hex");

const CIPHER = "aes-256-cbc";

interface EncryptedToken {
	iv: string;
	value: string;
}

type GuacamoleConnectionConfig<TType extends GuacamoleProtocol> = {
	type: TType;
	settings: TType extends "rdp"
		? RDPParameters
		: TType extends "vnc"
			? VNCParameters
			: TType extends "ssh"
				? SSHParameters
				: TType extends "telnet"
					? TelnetParameters
					: TType extends "kubernetes"
						? KubernetesParameters
						: never;
};

type GuacamoleTokenObject<TType extends GuacamoleProtocol = GuacamoleProtocol> =
	| { connection: GuacamoleConnectionConfig<TType> }
	| { connection: JoinConnectionSettings };

export function createGuacamoleToken(tokenObject: GuacamoleTokenObject) {
	const iv = randomBytes(16);
	const cipher = createCipheriv(CIPHER, Buffer.from(env.GUACD_SECRET), iv);

	let encrypted = cipher.update(JSON.stringify(tokenObject), "utf8", "base64");
	encrypted += cipher.final("base64");

	const data: EncryptedToken = {
		iv: iv.toString("base64"),
		value: encrypted
	};

	const json = JSON.stringify(data);
	return Buffer.from(json).toString("base64");
}
