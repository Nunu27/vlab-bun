import type {
	Client2ServerEvents,
	InterServerEvents,
	Server2ClientEvents,
	SocketData
} from "@vlab/shared/schemas/ws";
import type { Session, Topic, TopicData } from "@vlab/shared/types";
import type { Server, Socket } from "socket.io";

type IOServer = Server<
	Client2ServerEvents,
	Server2ClientEvents,
	InterServerEvents,
	SocketData
>;

type IOSocket = Socket<
	Client2ServerEvents,
	Server2ClientEvents,
	InterServerEvents,
	SocketData
>;

export class TopicEmitter {
	private topicRegistry = new Map<string, Topic<any, any, any>>();

	constructor(private io: IOServer) {}

	/**
	 * Register a topic for subscription handling
	 */
	register<T extends Topic<any, any, any>>(topic: T): void {
		this.topicRegistry.set(topic.name, topic);
	}

	/**
	 * Get a registered topic by name
	 */
	getTopic(name: string): Topic<any, any, any> | undefined {
		return this.topicRegistry.get(name);
	}

	/**
	 * Emit data to a specific topic room
	 */
	emit<T extends Topic<any, any, any>, TRoom extends T["rooms"][number]>(
		topic: T,
		roomPattern: TRoom extends string
			? TRoom
			: TRoom extends { path: infer P }
				? P
				: never,
		params: Record<string, string>,
		data: TopicData<T>
	): void {
		const room = topic.getTopicRoom(roomPattern as any, params);
		this.io.to(room).emit("topic", {
			topic: topic.name,
			room: topic.buildRoom(roomPattern as any, params),
			data
		});
	}

	/**
	 * Emit data to multiple rooms
	 */
	emitToMany<T extends Topic<any, any, any>, TRoom extends T["rooms"][number]>(
		topic: T,
		roomPattern: TRoom extends string
			? TRoom
			: TRoom extends { path: infer P }
				? P
				: never,
		paramsList: Array<Record<string, string>>,
		data: TopicData<T>
	): void {
		for (const params of paramsList) {
			this.emit(topic, roomPattern as any, params, data);
		}
	}

	/**
	 * Emit batch of different data to different rooms
	 */
	emitBatch<T extends Topic<any, any, any>, TRoom extends T["rooms"][number]>(
		topic: T,
		roomPattern: TRoom extends string
			? TRoom
			: TRoom extends { pattern: infer P }
				? P
				: never,
		items: Array<{
			params: Record<string, string>;
			data: TopicData<T>;
		}>
	): void {
		for (const { params, data } of items) {
			this.emit(topic, roomPattern as any, params, data);
		}
	}

	/**
	 * Handle topic subscription with access check
	 * Looks up the topic from registry and validates access
	 */
	async handleSubscribe(
		socket: IOSocket,
		topicName: string,
		room: string,
		session: Session
	): Promise<boolean> {
		const topic = this.topicRegistry.get(topicName);
		if (!topic) {
			console.warn(`Topic not found: ${topicName}`);
			return false;
		}

		// Parse room to extract pattern and params
		// Room format: "/user/123" -> pattern: "/user/:userId", params: { userId: "123" }
		const { pattern, params } = this.parseRoom(topic, room);
		if (!pattern) {
			console.warn(
				`Could not match room ${room} to any pattern in topic ${topicName}`
			);
			return false;
		}

		// Check access
		const hasAccess = await topic.checkAccess(pattern as any, params, session);
		if (!hasAccess) {
			return false;
		}

		// Join the room
		const fullRoom = `${topicName}${room}`;
		await socket.join(fullRoom);

		return true;
	}

	/**
	 * Parse a room string to find matching pattern and extract params
	 */
	private parseRoom(
		topic: Topic<any, any, any>,
		room: string
	): { pattern: string | null; params: Record<string, string> } {
		for (const roomDef of topic.rooms) {
			const pattern = typeof roomDef === "string" ? roomDef : roomDef.path;
			const params = this.matchPattern(pattern, room);
			if (params) {
				return { pattern, params };
			}
		}
		return { pattern: null, params: {} };
	}

	/**
	 * Match a room string against a pattern and extract parameters
	 */
	private matchPattern(
		pattern: string,
		room: string
	): Record<string, string> | null {
		const patternParts = pattern.split("/");
		const roomParts = room.split("/");

		if (patternParts.length !== roomParts.length) {
			return null;
		}

		const params: Record<string, string> = {};

		for (let i = 0; i < patternParts.length; i++) {
			const patternPart = patternParts[i];
			const roomPart = roomParts[i];

			if (patternPart.startsWith(":")) {
				// This is a parameter
				const paramName = patternPart.slice(1);
				params[paramName] = roomPart;
			} else if (patternPart !== roomPart) {
				// Static part doesn't match
				return null;
			}
		}

		return params;
	}

	/**
	 * Handle topic unsubscription
	 */
	async handleUnsubscribe(
		socket: IOSocket,
		topicName: string,
		room: string
	): Promise<void> {
		const fullRoom = `${topicName}${room}`;
		await socket.leave(fullRoom);
	}
}
