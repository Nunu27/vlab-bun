import type { DBListener, Operations } from "@vlab/db-listener";
import type { Topic, TopicData } from "@vlab/shared/types";
import type {
	ExtractTablesWithRelations,
	InferSelectModel,
	Table
} from "drizzle-orm";
import type { TopicEmitter } from "./topic-emitter";

type RoomConfig =
	| string
	| string[]
	| { path: string; params: Record<string, string> }
	| Array<{ path: string; params: Record<string, string> }>;

type RoomConfigFunction<TData> = (event: {
	op: Operations;
	table: string;
	data: TData;
}) => RoomConfig;

// Check if transformer is required based on data compatibility
type IsTransformerRequired<
	TTable extends Table,
	TKeys extends keyof InferSelectModel<TTable>,
	TTopic extends Topic<any, any, any>
> = [Pick<InferSelectModel<TTable>, TKeys>] extends [TopicData<TTopic>]
	? [TopicData<TTopic>] extends [Pick<InferSelectModel<TTable>, TKeys>]
		? false
		: true
	: true;

type DBEmitterConfig<
	TSchema extends Record<string, any>,
	TEntity extends keyof ExtractTablesWithRelations<TSchema>,
	TTable extends TSchema[TEntity] extends Table ? TSchema[TEntity] : Table,
	TKeys extends keyof InferSelectModel<TTable>,
	TTopic extends Topic<any, any, any>,
	TOps extends Array<Operations> = []
> = {
	listener: DBListener<TSchema>;
	emitter: TopicEmitter;
	entity: TEntity;
	columns: TKeys[];
	topic: TTopic;
	room:
		| RoomConfig
		| RoomConfigFunction<{
				previous: Pick<InferSelectModel<TTable>, TKeys> | null;
				current: Pick<InferSelectModel<TTable>, TKeys> | null;
		  }>;
	ops?: TOps;
	paused?: boolean;
} & (IsTransformerRequired<TTable, TKeys, TTopic> extends true
	? {
			transformer: (event: {
				op: Operations;
				table: string;
				data: {
					previous: Pick<InferSelectModel<TTable>, TKeys> | null;
					current: Pick<InferSelectModel<TTable>, TKeys> | null;
				};
			}) => TopicData<TTopic>;
		}
	: {
			transformer?: (event: {
				op: Operations;
				table: string;
				data: {
					previous: Pick<InferSelectModel<TTable>, TKeys> | null;
					current: Pick<InferSelectModel<TTable>, TKeys> | null;
				};
			}) => TopicData<TTopic>;
		});

/**
 * Add a database listener that emits to a topic
 */
export function addDBTopicEmitter<
	TSchema extends Record<string, any>,
	TEntity extends keyof ExtractTablesWithRelations<TSchema>,
	TTable extends TSchema[TEntity] extends Table ? TSchema[TEntity] : Table,
	TKeys extends keyof InferSelectModel<TTable>,
	TTopic extends Topic<any, any, any>,
	TOps extends Array<Operations> = []
>(
	config: DBEmitterConfig<TSchema, TEntity, TTable, TKeys, TTopic, TOps>
): void {
	const {
		listener,
		emitter,
		entity,
		columns,
		topic,
		room,
		transformer,
		ops,
		paused
	} = config;

	// Normalize room config to array of {pattern, params}
	const normalizeRoomConfig = (
		roomConfig: RoomConfig
	): Array<{ path: string; params: Record<string, string> }> => {
		if (typeof roomConfig === "string") {
			return [{ path: roomConfig, params: {} }];
		}

		if (Array.isArray(roomConfig)) {
			return roomConfig.map((r) =>
				typeof r === "string" ? { path: r, params: {} } : r
			);
		}

		return [roomConfig];
	};

	listener.addListener(
		entity,
		columns,
		async (event) => {
			const { current } = event.data;
			if (!current) return;

			// Determine rooms to emit to
			const roomConfig = typeof room === "function" ? room(event) : room;
			const rooms = normalizeRoomConfig(roomConfig);

			// Transform data if transformer provided
			const emitData = transformer
				? transformer(event)
				: (current as any as TopicData<TTopic>);

			// Emit to all rooms
			for (const { path, params } of rooms) {
				emitter.emit(topic, path as any, params, emitData);
			}
		},
		{ ops, paused, bulk: false }
	);
}
