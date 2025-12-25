import env from "@backend/env";
import Docker from "dockerode";

export const hostDocker = new Docker();
export const clabDocker = env.CLAB_DIND
	? new Docker({ host: env.CLAB_HOST, port: 2375 })
	: hostDocker;

export default {
	hostDocker,
	clabDocker
};
