import env from "@backend/env";
import Docker from "dockerode";

const docker = new Docker({ host: env.CLAB_HOST, port: 2375 });

export default docker;
