import type { Static, TSchema } from "elysia";
import type { Session } from "./session";

/**
 * Extract parameter names from room path
 * Example: "/user/:userId/lab/:labId" => "userId" | "labId"
 */
export type ExtractParams<T extends string> =
	T extends `${infer _Start}:${infer Param}/${infer Rest}`
		? Param | ExtractParams<Rest>
		: T extends `${infer _Start}:${infer Param}`
			? Param
			: never;

/**
 * Build room params object from path
 * Example: "/user/:userId" => { userId: string }
 */
export type RoomParams<T extends string> =
	ExtractParams<T> extends never
		? Record<string, never>
		: {
				[K in ExtractParams<T>]: string;
			};

/**
 * Access check function for a room
 * Returns true if user can access this room, false otherwise
 */
export type RoomAccessCheck<TRoom extends string> = (context: {
	params: RoomParams<TRoom>;
	session: Session;
}) => boolean | Promise<boolean>;

/**
 * Room definition - can be either:
 * - A string path (public access)
 * - An object with path and optional access check
 */
export type RoomDefinition<TRoom extends string> =
	| TRoom
	| {
			/** Room path (e.g., "/user/:userId") */
			path: TRoom;
			/** Optional access check function */
			check?: RoomAccessCheck<TRoom>;
	  };

/**
 * Extract the path string from a room definition
 */
export type RoomPath<T> = T extends string
	? T
	: T extends { path: infer P }
		? P
		: never;

/**
 * Topic schema definition
 */
export type TopicSchema<
	TName extends string,
	TRooms extends readonly RoomDefinition<string>[],
	TData extends TSchema
> = {
	/** Topic name */
	name: TName;
	/** Array of room definitions */
	rooms: TRooms;
	/** Data schema for messages */
	data: TData;
};

/**
 * Topic configuration with helper methods
 */
export type Topic<
	TName extends string,
	TRooms extends readonly RoomDefinition<string>[],
	TData extends TSchema
> = TopicSchema<TName, TRooms, TData> & {
	/** Build room name from parameters */
	buildRoom: <TRoom extends RoomPath<TRooms[number]>>(
		path: TRoom,
		params: RoomParams<TRoom>
	) => string;
	/** Get full topic room (topic name + room) */
	getTopicRoom: <TRoom extends RoomPath<TRooms[number]>>(
		path: TRoom,
		params: RoomParams<TRoom>
	) => string;
	/** Check if user has access to a room */
	checkAccess: <TRoom extends RoomPath<TRooms[number]>>(
		path: TRoom,
		params: RoomParams<TRoom>,
		session: Session
	) => Promise<boolean>;
	/** Get room definition by path */
	getRoom: <TRoom extends RoomPath<TRooms[number]>>(
		path: TRoom
	) => RoomDefinition<TRoom> | undefined;
};

/**
 * Helper to create a topic with strict typing
 */
export const createTopic = <
	TName extends string,
	TRooms extends readonly RoomDefinition<string>[],
	TData extends TSchema
>(
	config: TopicSchema<TName, TRooms, TData>
): Topic<TName, TRooms, TData> => {
	const buildRoom = <TRoom extends RoomPath<TRooms[number]>>(
		path: TRoom,
		params: RoomParams<TRoom>
	): string => {
		let room = path as string;
		for (const [key, value] of Object.entries(params)) {
			room = room.replace(`:${key}`, value);
		}
		return room;
	};

	const getTopicRoom = <TRoom extends RoomPath<TRooms[number]>>(
		path: TRoom,
		params: RoomParams<TRoom>
	): string => {
		return `${config.name}${buildRoom(path, params)}`;
	};

	const getRoom = <TRoom extends RoomPath<TRooms[number]>>(
		rawPath: TRoom
	): RoomDefinition<TRoom> | undefined => {
		const room = config.rooms.find((r) => {
			const path = typeof r === "string" ? r : r.path;
			return path === rawPath;
		});
		return room as RoomDefinition<TRoom> | undefined;
	};

	const checkAccess = async <TRoom extends RoomPath<TRooms[number]>>(
		path: TRoom,
		params: RoomParams<TRoom>,
		session: Session
	): Promise<boolean> => {
		const room = getRoom(path);
		if (!room) return false;

		// If room is just a string, it's public
		if (typeof room === "string") return true;

		// If no check function, it's public
		if (!room.check) return true;

		return await room.check({ params, session });
	};

	return {
		...config,
		buildRoom,
		getTopicRoom,
		checkAccess,
		getRoom
	};
};

/**
 * Extract topic data type
 */
export type TopicData<T extends Topic<any, any, any>> =
	T extends Topic<any, any, infer TData> ? Static<TData> : never;
