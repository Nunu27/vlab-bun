require("dotenv").config();
const { RouterOSClient } = require("./index.js");

(async () => {
	const host = process.env.MIKROTIK_HOST || "192.168.1.1";
	const port = parseInt(process.env.MIKROTIK_PORT, 10) || 8728;
	const username = process.env.MIKROTIK_USERNAME || "admin";
	const password = process.env.MIKROTIK_PASSWORD || "password";

	console.log(`🔌 Connecting to MikroTik at ${host}:${port}`);
	const client = new RouterOSClient(host, port);

	try {
		await client.connect();
		console.log("✅ Connected to RouterOS");

		await client.login(username, password);
		console.log(`✅ Logged in successfully as ${username}`);

		console.log("\n--- STARTING STREAM ---");
		const stream = await client.stream("/user/active/listen");

		stream.on("data", (data) => {
			console.log("📥 Stream data received:", data);
		});

		stream.on("error", (err) => {
			console.error("❌ Stream error:", err.message);
		});

		stream.on("end", () => {
			console.log("🛑 Stream ended by router");
		});

		console.log("Listening for 5 seconds...");
		await new Promise((r) => setTimeout(r, 5000));

		console.log("\n--- CANCELLING STREAM ---");
		stream.cancel();

		await new Promise((r) => setTimeout(r, 1000));
	} catch (error) {
		console.error("❌ Connection/Login error:", error.message);
	} finally {
		client.close();
		console.log("✅ Connection closed");
	}
})();
