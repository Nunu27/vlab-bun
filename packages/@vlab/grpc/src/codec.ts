import { decode, encode } from "@msgpack/msgpack";
import type { Codec } from "waycast";

export const msgpackCodec: Codec = {
	encode(value) {
		return Buffer.from(encode(value)).toString("base64");
	},
	decode(raw) {
		return decode(Buffer.from(raw, "base64"));
	},
};
