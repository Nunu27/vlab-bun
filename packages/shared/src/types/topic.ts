import type { Static, TSchema } from "elysia";

export type ExtractParams<T extends string> =
	T extends `${infer _Start}:${infer Param}/${infer Rest}`
		? Param | ExtractParams<Rest>
		: T extends `${infer _Start}:${infer Param}`
			? Param
			: never;

export type RoomParams<T extends string> =
	ExtractParams<T> extends never
		? Record<string, never>
		: {
				[K in ExtractParams<T>]: string;
			};

export type TopicSchema<
	TName extends string,
	TRoom extends string,
	TData extends TSchema
> = {
	name: TName;
	room: TRoom;
	data: TData;
};

export type Topic<
	TName extends string,
	TRoom extends string,
	TData extends TSchema
> = TopicSchema<TName, TRoom, TData> & {
	buildRoom: (params: RoomParams<TRoom>) => string;
	getTopicRoom: (params: RoomParams<TRoom>) => string;
};

export const createTopic = <
	TName extends string,
	TRoom extends string,
	TData extends TSchema
>(
	config: TopicSchema<TName, TRoom, TData>
): Topic<TName, TRoom, TData> => {
	const buildRoom = (params: RoomParams<TRoom>): string => {
		let room = config.room;
		for (const [key, value] of Object.entries(params)) {
			room = room.replace(`:${key}`, value) as TRoom;
		}
		return room;
	};

	const getTopicRoom = (params: RoomParams<TRoom>): string => {
		return `${config.name}${buildRoom(params)}`;
	};

	return {
		...config,
		buildRoom,
		getTopicRoom
	};
};

export type TopicData<T extends Topic<any, any, any>> =
	T extends Topic<any, any, infer TData> ? Static<TData> : never;
export type TopicRoomParams<T extends Topic<any, any, any>> =
	T extends Topic<any, infer TRoom, any> ? RoomParams<TRoom> : never;
