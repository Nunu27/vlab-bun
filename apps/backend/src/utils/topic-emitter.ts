import type {
	Client2ServerEvents,
	InterServerEvents,
	Server2ClientEvents,
	SocketData
} from "@vlab/shared/schemas/ws";
import type { Topic, TopicData, TopicRoomParams } from "@vlab/shared/types";
import type { RemoteSocket, Server } from "socket.io";

type IOServer = Server<
	Client2ServerEvents,
	Server2ClientEvents,
	InterServerEvents,
	SocketData
>;

export class TopicEmitter {
	constructor(private io: IOServer) {}

	emit<T extends Topic<any, any, any>>(
		topic: T,
		params: TopicRoomParams<T>,
		data: TopicData<T>
	): void {
		const room = topic.getTopicRoom(params);
		this.io.to(room).emit("topic", {
			topic: topic.name,
			room: topic.buildRoom(params),
			data
		});
	}

	emitToMany<T extends Topic<any, any, any>>(
		topic: T,
		paramsList: TopicRoomParams<T>[],
		data: TopicData<T>
	): void {
		for (const params of paramsList) {
			this.emit(topic, params, data);
		}
	}

	emitBatch<T extends Topic<any, any, any>>(
		topic: T,
		items: Array<{
			params: TopicRoomParams<T>;
			data: TopicData<T>;
		}>
	): void {
		for (const { params, data } of items) {
			this.emit(topic, params, data);
		}
	}

	async subscribe<T extends Topic<any, any, any>>(
		socketId: string,
		topic: T,
		params: TopicRoomParams<T>
	): Promise<void> {
		const room = topic.getTopicRoom(params);
		const sockets = await this.io.in(socketId).fetchSockets();
		for (const socket of sockets) {
			await socket.join(room);
		}
	}

	async unsubscribe<T extends Topic<any, any, any>>(
		socketId: string,
		topic: T,
		params: TopicRoomParams<T>
	): Promise<void> {
		const room = topic.getTopicRoom(params);
		const sockets = await this.io.in(socketId).fetchSockets();
		for (const socket of sockets) {
			await socket.leave(room);
		}
	}

	async getSockets<T extends Topic<any, any, any>>(
		topic: T,
		params: TopicRoomParams<T>
	): Promise<RemoteSocket<Server2ClientEvents, SocketData>[]> {
		const room = topic.getTopicRoom(params);
		return this.io.in(room).fetchSockets();
	}

	async getSubscriberCount<T extends Topic<any, any, any>>(
		topic: T,
		params: TopicRoomParams<T>
	): Promise<number> {
		const sockets = await this.getSockets(topic, params);
		return sockets.length;
	}
}
