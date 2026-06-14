import { resolve } from "node:path";
import { Containerlab } from "@vlab/clab";

const clab = new Containerlab({
	topologiesPath: resolve(process.cwd(), "topologies"),
});
console.log(clab);
