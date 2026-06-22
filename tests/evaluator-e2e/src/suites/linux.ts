import { it } from "bun:test";
import type { TestContext } from "../context";

export function testLinux(getCtx: () => TestContext) {
	it("node-interface: check-ip (linux)", async () => {
		const { docker, nodeMap, waitForCheck } = getCtx();
		const linuxContainer = docker.getContainer(
			nodeMap.linux1?.containerId || "",
		);
		const exec = await linuxContainer.exec({
			Cmd: ["ip", "addr", "add", "10.0.1.3/24", "dev", "eth1"],
		});
		await exec.start({ Detach: true, Tty: false });
		await waitForCheck("linux1-check-ip", 35000);
	}, 35000);

	it("linux: user-exist", async () => {
		const { docker, nodeMap, waitForCheck } = getCtx();
		const linuxContainer = docker.getContainer(
			nodeMap.linux1?.containerId || "",
		);
		const exec = await linuxContainer.exec({
			Cmd: ["useradd", "-m", "vlabtester"],
		});
		await exec.start({ Detach: true, Tty: false });
		await waitForCheck("linux1-user-exist", 35000);
	}, 35000);

	it("linux: route-exist", async () => {
		const { docker, nodeMap, waitForCheck } = getCtx();
		const linuxContainer = docker.getContainer(
			nodeMap.linux1?.containerId || "",
		);
		const ipExec = await linuxContainer.exec({
			Cmd: ["ip", "addr", "add", "10.0.1.2/24", "dev", "eth1"],
		});
		await ipExec.start({ Detach: true, Tty: false });
		const exec = await linuxContainer.exec({
			Cmd: ["ip", "route", "add", "192.168.100.0/24", "via", "10.0.1.1"],
		});
		await exec.start({ Detach: true, Tty: false });
		await waitForCheck("linux1-route-exist", 35000);
	}, 35000);
}
