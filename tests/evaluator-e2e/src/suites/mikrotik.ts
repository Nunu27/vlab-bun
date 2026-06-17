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

	it("mikrotik: ospf-neighbor-exist", async () => {
		const { router1Client, router2Client, waitForCheck } = getCtx();
		// Configure OSPF on router2 matching router1's existing instance/area
		await router2Client.runQuery("/routing/ospf/instance/add", {
			name: "vlab-ospf",
			version: "2",
			"router-id": "2.2.2.2",
		});
		await router2Client.runQuery("/routing/ospf/area/add", {
			name: "backbone",
			instance: "vlab-ospf",
			"area-id": "0.0.0.0",
		});
		await router2Client.runQuery("/routing/ospf/interface-template/add", {
			interfaces: "ether2",
			area: "backbone",
		});
		// Add ether2 template on router1 so both sides participate on the shared link
		await router1Client.runQuery("/routing/ospf/interface-template/add", {
			interfaces: "ether2",
			area: "backbone",
		});
		// OSPF convergence requires hello exchange (default 10s interval); allow up to 60s
		await waitForCheck("router1-ospf-neighbor", 60000);
	}, 60000);

	it("mikrotik: bgp-connection-exist", async () => {
		const { router1Client, waitForCheck } = getCtx();
		// RouterOS 7.x requires explicit `instance` referencing the BGP instance name
		await router1Client.runQuery("/routing/bgp/connection/add", {
			name: "vlab-bgp-to-r2",
			instance: "vlab-bgp",
			"remote.as": "65001",
			"local.role": "ebgp",
			"remote.address": "10.0.0.2",
		});
		await waitForCheck("router1-bgp-connection", 35000);
	}, 35000);

	it("mikrotik: bgp-session-established", async () => {
		const { router2Client, waitForCheck } = getCtx();
		// Set up router2 as the BGP peer so the session can establish
		await router2Client.runQuery("/routing/bgp/instance/add", {
			name: "vlab-bgp",
			as: "65001",
			"router-id": "2.2.2.2",
		});
		await router2Client.runQuery("/routing/bgp/connection/add", {
			name: "vlab-bgp-to-r1",
			instance: "vlab-bgp",
			"remote.as": "65000",
			"local.role": "ebgp",
			"remote.address": "10.0.0.1",
		});
		// BGP session establishment can take up to 60s in container environment
		await waitForCheck("router1-bgp-session", 60000);
	}, 60000);
}
