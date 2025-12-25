interface BaseDockerEvent {
	id: string;
	time: number;
	timeNano: number;
	scope: "local" | "swarm";
}

interface ContainerAttributes {
	name: string;
	image: string;
	[key: string]: string | undefined;
}

interface ContainerDieAttributes extends ContainerAttributes {
	exitCode: string;
}

interface ContainerHealthAttributes extends ContainerAttributes {
	execDuration?: string;
}

interface NetworkAttributes {
	name: string;
	type: string;
	[key: string]: string | undefined;
}

interface NetworkConnectAttributes extends NetworkAttributes {
	container: string;
}

interface ImageAttributes {
	name?: string;
	[key: string]: string | undefined;
}

interface VolumeAttributes {
	driver: string;
	[key: string]: string | undefined;
}

// TYPE: CONTAINER
type ContainerEvent =
	| {
			Type: "container";
			Action: "die";
			Actor: {
				ID: string;
				Attributes: ContainerDieAttributes;
			};
	  }
	| {
			Type: "container";
			Action:
				| "health_status: healthy"
				| "health_status: unhealthy"
				| "health_status: starting";
			Actor: {
				ID: string;
				Attributes: ContainerHealthAttributes;
			};
	  }
	| {
			Type: "container";
			Action:
				| "create"
				| "start"
				| "stop"
				| "kill"
				| "restart"
				| "pause"
				| "unpause"
				| "rename"
				| "destroy"
				| "exec_create"
				| "exec_start"
				| "exec_die";
			Actor: {
				ID: string;
				Attributes: ContainerAttributes;
			};
	  };

// TYPE: NETWORK
type NetworkEvent =
	| {
			Type: "network";
			Action: "connect" | "disconnect";
			Actor: {
				ID: string;
				Attributes: NetworkConnectAttributes;
			};
	  }
	| {
			Type: "network";
			Action: "create" | "destroy" | "remove";
			Actor: {
				ID: string;
				Attributes: NetworkAttributes;
			};
	  };

// TYPE: IMAGE
type ImageEvent = {
	Type: "image";
	Action:
		| "pull"
		| "push"
		| "save"
		| "delete"
		| "tag"
		| "untag"
		| "mount"
		| "unmount";
	Actor: {
		ID: string;
		Attributes: ImageAttributes;
	};
};

// TYPE: VOLUME
type VolumeEvent = {
	Type: "volume";
	Action: "create" | "mount" | "unmount" | "destroy";
	Actor: {
		ID: string;
		Attributes: VolumeAttributes;
	};
};

export type DockerEvent = BaseDockerEvent &
	(
		| ContainerEvent
		| NetworkEvent
		| ImageEvent
		| VolumeEvent
		| {
				Type: "daemon" | "plugin" | "service" | "node" | "secret" | "config";
				Action: string;
				Actor: {
					ID: string;
					Attributes: Record<string, string | undefined>;
				};
		  }
	);
