import env from "@backend/env";
import Docker from "dockerode";

export default env.CLAB_DIND
	? new Docker({ host: env.CLAB_HOST, port: 2375 })
	: new Docker();
