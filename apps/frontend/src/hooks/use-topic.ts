/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWSStore } from '@frontend/stores/ws-store';
import type { RoomDefinition, RoomParams, Topic } from '@vlab/shared/types';
import type { Static, TSchema } from 'elysia';
import { useEffect, useRef, useState } from 'react';

export function useWSTopic<
  TName extends string,
  TRooms extends RoomDefinition<string>,
  TData extends TSchema,
  TRooms2 extends Topic<TName, TRooms, TData>['rooms'],
  TRoom extends TRooms2 extends readonly any[] ? TRooms2[number] : TRooms2,
  TPath extends TRoom extends string
    ? TRoom
    : TRoom extends { path: infer P }
      ? P
      : never,
>(
  topic: Topic<TName, TRooms, TData>,
  path: TPath,
  params: RoomParams<TPath & string>,
  callback: (data: Static<TData>) => void,
): void {
  const { subscribe } = useWSStore.use.actions();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const unsubscribe = subscribe(topic, path, params, (data) =>
      callbackRef.current(data),
    );

    return unsubscribe;
  }, [topic, path, params, subscribe]);
}

export function useWSTopicData<
  TName extends string,
  TRooms extends RoomDefinition<string>,
  TData extends TSchema,
  TRooms2 extends Topic<TName, TRooms, TData>['rooms'],
  TRoom extends TRooms2 extends readonly any[] ? TRooms2[number] : TRooms2,
  TPath extends TRoom extends string
    ? TRoom
    : TRoom extends { path: infer P }
      ? P
      : never,
>(
  topic: Topic<TName, TRooms, TData>,
  path: TPath,
  params: RoomParams<TPath & string>,
): Static<TData> | null {
  const [data, setData] = useState<Static<TData> | null>(null);

  useWSTopic(topic, path, params, setData);

  return data;
}
