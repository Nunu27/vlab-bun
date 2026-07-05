import Containerlab from "@vlab/clab";
import env from "../env";

const clab = new Containerlab({
	cliPath: env.CLAB_CLI_PATH,
	topologiesPath: env.CLAB_TOPOLOGIES_PATH,
});

export default clab;
