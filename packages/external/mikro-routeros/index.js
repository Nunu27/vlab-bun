const net = require("node:net");
const crypto = require("node:crypto");
const { EventEmitter } = require("node:events");

function encodeLength(len) {
	if (len < 0x80) return Buffer.from([len]);
	if (len < 0x4000) return Buffer.from([(len >> 8) | 0x80, len & 0xff]);
	if (len < 0x200000)
		return Buffer.from([(len >> 16) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
	if (len < 0x10000000)
		return Buffer.from([
			(len >> 24) | 0xe0,
			(len >> 16) & 0xff,
			(len >> 8) & 0xff,
			len & 0xff,
		]);
	return Buffer.from([
		0xf0,
		(len >> 24) & 0xff,
		(len >> 16) & 0xff,
		(len >> 8) & 0xff,
		len & 0xff,
	]);
}

function encodeWord(word) {
	const wordBuf = Buffer.from(word, "utf8");
	return Buffer.concat([encodeLength(wordBuf.length), wordBuf]);
}

function decodeLength(buffer, offset = 0) {
	if (offset >= buffer.length) return null;

	const firstByte = buffer[offset];

	if ((firstByte & 0x80) === 0) {
		// Length is 0-127, single byte
		return { length: firstByte, bytesUsed: 1 };
	} else if ((firstByte & 0xc0) === 0x80) {
		// Length is 128-16383, two bytes
		if (offset + 1 >= buffer.length) return null;
		const length = ((firstByte & 0x3f) << 8) | buffer[offset + 1];
		return { length, bytesUsed: 2 };
	} else if ((firstByte & 0xe0) === 0xc0) {
		// Length is 16384-2097151, three bytes
		if (offset + 2 >= buffer.length) return null;
		const length =
			((firstByte & 0x1f) << 16) |
			(buffer[offset + 1] << 8) |
			buffer[offset + 2];
		return { length, bytesUsed: 3 };
	} else if ((firstByte & 0xf0) === 0xe0) {
		// Length is 2097152-268435455, four bytes
		if (offset + 3 >= buffer.length) return null;
		const length =
			((firstByte & 0x0f) << 24) |
			(buffer[offset + 1] << 16) |
			(buffer[offset + 2] << 8) |
			buffer[offset + 3];
		return { length, bytesUsed: 4 };
	} else if (firstByte === 0xf0) {
		// Length is 268435456+, five bytes
		if (offset + 4 >= buffer.length) return null;
		const length =
			(buffer[offset + 1] << 24) |
			(buffer[offset + 2] << 16) |
			(buffer[offset + 3] << 8) |
			buffer[offset + 4];
		return { length, bytesUsed: 5 };
	}

	return null;
}

function parseSentences(buffer) {
	const sentences = [];
	let offset = 0;

	while (offset < buffer.length) {
		const sentence = [];

		// Parse words until we hit a zero-length word (sentence terminator)
		while (offset < buffer.length) {
			const lengthInfo = decodeLength(buffer, offset);
			if (!lengthInfo) break;

			offset += lengthInfo.bytesUsed;

			if (lengthInfo.length === 0) {
				// End of sentence
				break;
			}

			if (offset + lengthInfo.length > buffer.length) {
				// Incomplete word, return what we have so far
				return {
					sentences,
					remainingBuffer: buffer.slice(offset - lengthInfo.bytesUsed),
				};
			}

			const word = buffer
				.slice(offset, offset + lengthInfo.length)
				.toString("utf8");
			sentence.push(word);
			offset += lengthInfo.length;
		}

		if (sentence.length > 0) {
			sentences.push(sentence);
		}
	}

	return { sentences, remainingBuffer: Buffer.alloc(0) };
}

function parseResponseToObjects(responses) {
	return responses
		.filter((sentence) => sentence[0] === "!re") // Only process data replies
		.map((sentence) => {
			const obj = {};

			// Skip the first element ('!re') and process the rest
			sentence.slice(1).forEach((item) => {
				if (item.startsWith("=")) {
					const [key, ...valueParts] = item.slice(1).split("=");
					const value = valueParts.join("="); // Rejoin in case value contains '='
					obj[key] = value;
				}
			});

			return obj;
		});
}

class RouterOSClient {
	constructor(host, port = 8728, timeout = 30000) {
		this.host = host;
		this.port = port;
		this.timeout = timeout; // Connection timeout in milliseconds
		this.monitorTimeout = timeout * 2; // Longer timeout for monitor commands
		this.socket = new net.Socket();
		this.socket.setKeepAlive(true);
		this.socket.setNoDelay(true);
		this.buffer = Buffer.alloc(0);
		this.loggedIn = false;
		this.credentials = null; // { username, password }
		this.pendingRequests = new Map();
		this.tagCounter = 0;

		// Bind error handlers
		this._handleGlobalError = this._handleGlobalError.bind(this);
		this._onData = this._onData.bind(this);
	}

	connect() {
		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				this.socket.destroy();
				reject(new Error(`Connection timeout after ${this.timeout}ms`));
			}, this.timeout);

			this.socket.connect(this.port, this.host, () => {
				clearTimeout(timeoutId);
				resolve();
			});

			this.socket.once("error", (error) => {
				if (!this.loggedIn) {
					clearTimeout(timeoutId);
					reject(error);
				}
			});

			// Bind global events only once per new socket/connect
			this.socket.removeAllListeners("data");
			this.socket.removeAllListeners("error");
			this.socket.removeAllListeners("close");
			this.socket.removeAllListeners("end");

			this.socket.on("error", this._handleGlobalError);
			this.socket.on("close", () =>
				this._handleGlobalError(new Error("Socket closed")),
			);
			this.socket.on("end", () =>
				this._handleGlobalError(new Error("Socket ended")),
			);
			this.socket.on("data", this._onData);
		});
	}

	_handleGlobalError(error) {
		this.loggedIn = false;
		for (const [_tag, req] of this.pendingRequests.entries()) {
			clearTimeout(req.timeoutId);
			if (req.isStream) {
				req.emitter.emit("error", error);
			} else {
				req.fail(error);
			}
		}
		this.pendingRequests.clear();
	}

	_onData(chunk) {
		this.buffer = Buffer.concat([this.buffer, chunk]);
		const parseResult = parseSentences(this.buffer);
		this.buffer = parseResult.remainingBuffer;

		for (const sentence of parseResult.sentences) {
			if (sentence.length === 0) continue;

			const sentenceType = sentence[0];

			let tag = null;
			const tagItem = sentence.find((item) => item.startsWith(".tag="));
			if (tagItem) {
				tag = tagItem.slice(5);
			}

			let req = null;
			if (tag && this.pendingRequests.has(tag)) {
				req = this.pendingRequests.get(tag);
			} else if (this.pendingRequests.size === 1) {
				req = this.pendingRequests.values().next().value;
			} else if (this.pendingRequests.size > 0) {
				// If multiple pending requests but no tag matched, we can't safely route it.
				// Try to map by matching command, but fallback to ignoring or routing to first.
				// For legacy login this size===1 handles it safely.
			}

			if (sentenceType === "!fatal") {
				const fatalMsg = sentence.slice(1).join(" ");
				if (
					req?.retryOnNotLoggedIn &&
					/not logged in/i.test(fatalMsg) &&
					this.credentials &&
					!req.isLogin
				) {
					this.pendingRequests.delete(tag);
					clearTimeout(req.timeoutId);
					this.login(this.credentials.username, this.credentials.password)
						.then(() =>
							this._sendRaw(req.cmd, req.params, {
								requestTimeoutMs: req.requestTimeoutMs,
								collectAll: req.collectAll,
								retryOnNotLoggedIn: false,
							}),
						)
						.then(req.fulfill, req.fail);
					continue;
				}
				this._handleGlobalError(new Error(`RouterOS Fatal Error: ${fatalMsg}`));
				continue;
			}

			if (!req) continue;

			if (sentenceType === "!done") {
				req.done = true;
				if (req.collectAll && sentence.length > 0) {
					req.responses.push(sentence);
				} else if (sentence.length > 1) {
					req.responses.push(sentence);
				}

				if (req.isStream) {
					req.emitter.emit("end");
					this.pendingRequests.delete(tag);
				} else {
					this.pendingRequests.delete(tag);
					req.fulfill(req.responses);
				}
				clearTimeout(req.timeoutId);
			} else if (sentenceType === "!re") {
				req.responses.push(sentence);
				if (req.isStream) {
					const parsed = parseResponseToObjects([sentence]);
					if (parsed.length > 0) {
						req.emitter.emit("data", parsed[0]);
					}
				} else {
					if (req.cmd.includes("/monitor") && req.params.once !== undefined) {
						clearTimeout(req.timeoutId);
						this.pendingRequests.delete(tag);
						req.fulfill(req.responses);
					}
				}
			} else if (sentenceType === "!trap") {
				const errorMessage =
					sentence
						.slice(1)
						.find((item) => item.startsWith("=message="))
						?.slice(9) || "Unknown error";
				clearTimeout(req.timeoutId);
				this.pendingRequests.delete(tag);
				if (req.isStream) {
					// RouterOS replies to our own cancel() with a trap on this tag — not a real error.
					if (!req.cancelling) {
						req.emitter.emit(
							"error",
							new Error(`RouterOS Error: ${errorMessage}`),
						);
					}
				} else {
					req.fail(new Error(`RouterOS Error: ${errorMessage}`));
				}
			}
		}
	}

	async login(username, password) {
		// Persist credentials for automatic re-login
		this.credentials = { username, password };

		// 1) Try modern login (ROS >= 6.43): /login =name= =password=
		try {
			await this._sendRaw(
				"/login",
				{ name: username, password },
				{
					requestTimeoutMs: this.timeout,
					collectAll: false,
					retryOnNotLoggedIn: false,
				},
			);
			this.loggedIn = true;
			return [];
		} catch (err) {
			const message = String(err?.message ? err.message : err);
			// If credentials are invalid, don't attempt legacy flow
			if (
				/invalid user name or password|invalid username or password/i.test(
					message,
				)
			) {
				this.loggedIn = false;
				throw err;
			}
			// Fall through to attempt legacy challenge-response (ROS < 6.43)
		}

		// 2) Legacy login flow:
		//    a) Send /login (no params) → receive !done =ret=<hex-challenge>
		//    b) Send /login =name=<user> =response=00<md5(0x00 + password + challenge)>
		const probe = await this._sendRaw(
			"/login",
			{},
			{
				requestTimeoutMs: this.timeout,
				collectAll: true,
				retryOnNotLoggedIn: false,
			},
		);

		let challengeHex = null;
		for (const sentence of probe) {
			if (sentence[0] === "!done") {
				for (const item of sentence.slice(1)) {
					if (item.startsWith("=ret=")) {
						challengeHex = item.slice(5);
						break;
					}
				}
			}
			if (challengeHex) break;
		}

		if (!challengeHex) {
			throw new Error("RouterOS legacy login failed: no challenge received");
		}

		const challengeBuf = Buffer.from(challengeHex, "hex");
		const md5 = crypto.createHash("md5");
		md5.update(Buffer.from([0]));
		md5.update(Buffer.from(password, "utf8"));
		md5.update(challengeBuf);
		const response = `00${md5.digest("hex")}`;

		await this._sendRaw(
			"/login",
			{ name: username, response },
			{
				requestTimeoutMs: this.timeout,
				collectAll: false,
				retryOnNotLoggedIn: false,
			},
		);

		this.loggedIn = true;
		return [];
	}

	runQuery(cmd, params = {}) {
		// Normalize the command path
		cmd = cmd.startsWith("/") ? cmd : `/${cmd}`;

		// Special handling for monitor-traffic command
		const _isMonitorCommand = cmd.includes("/monitor");
		const transformedParams = {};

		if (cmd.includes("monitor-traffic")) {
			// For monitor-traffic commands, use standard keys; encoding is handled later
			if (params.name || params.interface) {
				transformedParams.interface = params.name || params.interface;
			}
			transformedParams.once = ""; // Always use once for monitor-traffic
			if (params.proplist || params[".proplist"]) {
				transformedParams[".proplist"] = params.proplist || params[".proplist"]; // API uses .proplist
			}
		} else {
			// For non-monitor commands, pass keys as-is; encoding is handled in _sendRaw
			for (const [key, value] of Object.entries(params)) {
				transformedParams[key] = value;
			}
		}

		return this._sendRaw(cmd, transformedParams, {
			requestTimeoutMs: 5000, // Short timeout for monitor-traffic
			collectAll: false, // Don't collect all responses
			retryOnNotLoggedIn: true,
		}).then((responses) => {
			const result = parseResponseToObjects(responses);
			return result.length > 0 ? result : [];
		});
	}

	_sendRaw(cmd, params = {}, options = {}) {
		const isMonitorCommand = cmd.includes("/monitor");
		const {
			requestTimeoutMs = isMonitorCommand ? 5000 : this.timeout,
			collectAll = false,
			retryOnNotLoggedIn = true,
			isStream = false,
		} = options;

		return new Promise((resolve, reject) => {
			const isQuery = cmd.includes("/print") || cmd.includes("/getall");
			const isLogin = cmd === "/login";

			const paramPrefix = isLogin ? "=" : isQuery ? "?" : "=";

			this.tagCounter++;
			const tag = `req-${this.tagCounter}`;

			const parts = [cmd].concat(
				Object.entries(params).map(([k, v]) => {
					const normalizedKey = String(k).replace(/^[=?]+/, "");
					const normalizedVal = v === undefined ? "" : v;
					return `${paramPrefix}${normalizedKey}=${normalizedVal}`;
				}),
			);

			parts.push(`.tag=${tag}`);

			const data = Buffer.concat(
				parts.map(encodeWord).concat([Buffer.from([0])]),
			);

			let settled = false;
			let emitter = null;
			if (isStream) {
				emitter = new EventEmitter();
				emitter.cancel = async () => {
					// Must be set before the await below, not after.
					reqObj.cancelling = true;
					try {
						await this._sendRaw("/cancel", { tag }, { requestTimeoutMs: 5000 });
					} catch (_err) {}
					if (this.pendingRequests.has(tag)) {
						this.pendingRequests.delete(tag);
					}
					emitter.emit("end");
				};
			}

			const reqObj = {
				cmd,
				params,
				isLogin,
				requestTimeoutMs,
				collectAll,
				retryOnNotLoggedIn,
				isStream,
				emitter,
				responses: [],
				done: false,
				timeoutId: null,
				fulfill: (val) => {
					if (settled) return;
					settled = true;
					resolve(val);
				},
				fail: (err) => {
					if (settled) return;
					settled = true;
					reject(err);
				},
			};

			if (!isStream) {
				reqObj.timeoutId = setTimeout(() => {
					reqObj.fail(new Error(`Request timeout after ${requestTimeoutMs}ms`));
					this.pendingRequests.delete(tag);
				}, requestTimeoutMs);
			}

			this.pendingRequests.set(tag, reqObj);

			try {
				this.socket.write(data);
			} catch (e) {
				this.pendingRequests.delete(tag);
				reqObj.fail(e);
			}

			if (isStream) {
				resolve(emitter);
			}
		});
	}

	async stream(cmd, params = {}) {
		// Normalize the command path
		cmd = cmd.startsWith("/") ? cmd : `/${cmd}`;

		// Convert monitor-traffic style params safely
		const transformedParams = {};
		for (const [key, value] of Object.entries(params)) {
			transformedParams[key] = value;
		}

		return await this._sendRaw(cmd, transformedParams, {
			isStream: true,
			retryOnNotLoggedIn: true,
		});
	}

	close() {
		this.socket.end();
	}
}

// Export the RouterOSClient class for use in other files
module.exports = { RouterOSClient };
