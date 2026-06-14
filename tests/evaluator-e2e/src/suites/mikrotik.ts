import { it } from "bun:test";
import type { TestContext } from "../context";

export function testMikrotik(getCtx: () => TestContext) {
	it("mikrotik: identity", async () => {
		const { router1Client, waitForCheck } = getCtx();
		await router1Client.runQuery("/system/identity/set", {
			name: "VLabRouter",
		});
		await waitForCheck("router1-system-identity", 35000);
	}, 35000);

	it("mikrotik: user-exist", async () => {
		const { router1Client, waitForCheck } = getCtx();
		await router1Client.runQuery("/user/add", {
			name: "vlabtester",
			group: "read",
			password: "password123",
		});
		await waitForCheck("router1-user-exist", 35000);
	}, 35000);

	it("mikrotik: route-exist", async () => {
		const { router1Client, router2Client, waitForCheck } = getCtx();
		await router2Client.runQuery("/ip/address/add", {
			address: "10.0.0.2/24",
			interface: "ether2",
		});
		await router1Client.runQuery("/ip/route/add", {
			"dst-address": "172.16.0.0/24",
			gateway: "10.0.0.2",
		});
		await waitForCheck("router1-route-exist", 35000);
	}, 35000);

	it("mikrotik: ospf instance, area, and template", async () => {
		const { router1Client, waitForCheck } = getCtx();
		await router1Client.runQuery("/routing/ospf/instance/add", {
			name: "vlab-ospf",
			version: "2",
			"router-id": "1.1.1.1",
		});
		await waitForCheck("router1-ospf-instance", 35000);

		await router1Client.runQuery("/routing/ospf/area/add", {
			name: "backbone",
			instance: "vlab-ospf",
			"area-id": "0.0.0.0",
		});
		await waitForCheck("router1-ospf-area", 35000);

		await router1Client.runQuery("/routing/ospf/interface-template/add", {
			interfaces: "ether1",
			area: "backbone",
		});
		await waitForCheck("router1-ospf-template", 35000);
	}, 35000);

	it("mikrotik: rip instance and template", async () => {
		const { router1Client, waitForCheck } = getCtx();
		await router1Client.runQuery("/routing/rip/instance/add", {
			name: "vlab-rip",
		});
		await waitForCheck("router1-rip-instance", 35000);

		await router1Client.runQuery("/routing/rip/interface-template/add", {
			interfaces: "ether1",
			instance: "vlab-rip",
		});
		await waitForCheck("router1-rip-template", 35000);
	}, 35000);

	it("mikrotik: bgp instance", async () => {
		const { router1Client, waitForCheck } = getCtx();
		await router1Client.runQuery("/routing/bgp/instance/add", {
			name: "vlab-bgp",
			as: "65000",
			"router-id": "1.1.1.1",
		});
		await waitForCheck("router1-bgp-instance", 35000);
	}, 35000);
}
