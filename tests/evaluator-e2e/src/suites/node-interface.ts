import { it } from "bun:test";
import type { TestContext } from "../context";

export function testNodeInterface(getCtx: () => TestContext) {
	it("node-interface: check-ip", async () => {
		const { router1Client, waitForCheck } = getCtx();
		await router1Client.runQuery("/ip/address/add", {
			address: "10.0.0.1/24",
			interface: "ether2",
		});
		await waitForCheck("router1-check-ip", 35000);
	}, 35000);
}
