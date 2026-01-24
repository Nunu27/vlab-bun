import { useWSStore } from '@frontend/stores/ws-store';
import type { RoomDefinition, RoomParams } from '@vlab/shared/types';
import type { Static, TSchema } from 'elysia';
import { useEffect, useRef } from 'react';

export function useWSTopic<
  TName extends string,
  TRooms extends readonly RoomDefinition<string>[],
  TData extends TSchema,
  TRoom extends string,
>(
  topic: {
    name: TName;
    rooms: TRooms;
    data: TData;
    buildRoom: (path: TRoom, params: RoomParams<TRoom>) => string;
  },
  path: TRoom,
  params: RoomParams<TRoom> | null,
  callback: (data: Static<TData>) => void,
): void {
  const { subscribe } = useWSStore.use.actions();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!params) return;

    const room = topic.buildRoom(path, params);

    const unsubscribe = subscribe<Static<TData>>(topic.name, room, (data) =>
      callbackRef.current(data),
    );

    return unsubscribe;
  }, [topic, path, params, subscribe]);
}
