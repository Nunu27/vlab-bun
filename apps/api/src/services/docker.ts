import Docker from "dockerode";

export default new Docker({ socketPath: "/var/run/docker.sock" });
