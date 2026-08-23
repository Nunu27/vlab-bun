import { it } from "bun:test";
import type { TestContext } from "../context";

export function testDhcp(getCtx: () => TestContext) {
	it("dhcp: linux2 obtains a lease from router1 and resolves via it", async () => {
		const { docker, nodeMap, waitForCheck } = getCtx();
		const linux2Container = docker.getContainer(
			nodeMap.linux2?.containerId || "",
		);
		const exec = await linux2Container.exec({
			Cmd: ["dhcpcd", "eth1"],
		});
		await exec.start({ Detach: true, Tty: false });

		// router1's lease table shows the handshake completed...
		await waitForCheck("router1-dhcp-lease", 60000);
		// ...and linux2 can resolve+reach router1 by hostname using the
		// DHCP-provided DNS server, proving the assigned address, gateway,
		// and resolver all actually work.
		await waitForCheck("linux2-dns-ping", 60000);
	}, 60000);
}
