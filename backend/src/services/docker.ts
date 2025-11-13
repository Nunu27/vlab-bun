import Dockerode from "dockerode";

export default new Dockerode({ socketPath: "/var/run/docker.sock" });
