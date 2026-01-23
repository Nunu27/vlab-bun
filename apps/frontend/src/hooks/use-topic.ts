import { useWSStore } from '@frontend/stores/ws-store';
import type { RoomParams, Topic } from '@vlab/shared/types';
import type { Static, TSchema } from 'elysia';
import { useEffect, useRef } from 'react';

export function useWSTopic<
  TName extends string,
  TRoom extends string,
  TData extends TSchema,
>(
  topic: Topic<TName, TRoom, TData>,
  params: RoomParams<TRoom>,
  callback: (data: Static<TData>) => void,
): void {
  const { subscribe } = useWSStore.use.actions();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!params) return;

    const room = topic.buildRoom(params);

    const unsubscribe = subscribe<Static<TData>>(topic.name, room, (data) =>
      callbackRef.current(data),
    );

    return unsubscribe;
  }, [topic, params, subscribe]);
}
