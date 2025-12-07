import ws, {
  type WSClient2ServerEvents,
  type WSServer2ClientEvents,
} from '@frontend/lib/ws';
import { useQuery } from '@tanstack/react-query';
import type { WSSchemas } from '@vlab/shared/schemas';
import type { ReplyData } from '@vlab/shared/types';
import type { MaybePromise, TSchema } from 'elysia';
import { useEffect, useRef, useState } from 'react';
import { authQueryOptions } from './use-auth';

type Server2ClientEvents = keyof WSServer2ClientEvents;
type Client2ServerEvents = keyof WSClient2ServerEvents;

function useWS() {
  const [connected, setConnected] = useState(false);
  const authQuery = useQuery(authQueryOptions);
  const loggedInRef = useRef(false);
  const listenersRef = useRef(
    new Map<string, (data: unknown) => MaybePromise<void>>(),
  );
  const listenersMapRef = useRef(new Map<Server2ClientEvents, string[]>());

  useEffect(() => {
    const loggedIn = Boolean(authQuery.data);

    if (loggedIn === loggedInRef.current) return;

    loggedInRef.current = loggedIn;

    if (loggedIn) {
      if (!ws.listeners('connect').length) {
        ws.connect();

        console.log('[WebSocket] Connecting...');

        ws.on('connect', () => {
          console.log('[WebSocket] Connected');
          setConnected(true);
        });

        ws.on('disconnect', () => {
          console.log('[WebSocket] Disconnected');
          setConnected(false);
        });
      }
    } else {
      ws.disconnect();

      for (const event of listenersMapRef.current.keys()) {
        ws.off(event);
      }

      listenersRef.current.clear();
      listenersMapRef.current.clear();

      ws.off('connect');
      ws.off('disconnect');
    }
  }, [authQuery.data]);

  return {
    connected,
    subscribe: <TEvent extends Server2ClientEvents>(
      event: TEvent,
      callback: (
        data: Parameters<WSServer2ClientEvents[TEvent]>[0],
      ) => MaybePromise<void>,
    ) => {
      const id = Bun.randomUUIDv7();

      listenersRef.current.set(
        id,
        callback as (data: unknown) => MaybePromise<void>,
      );
      if (!listenersMapRef.current.has(event)) {
        listenersMapRef.current.set(event, [id]);

        ws.on(event, ((data: Parameters<WSServer2ClientEvents[TEvent]>[0]) => {
          const listenerIds = listenersMapRef.current.get(event) || [];

          for (const listenerId of listenerIds) {
            listenersRef.current.get(listenerId)?.(data);
          }
        }) as never);
      } else {
        listenersMapRef.current.get(event)?.push(id);
      }

      return () => {
        listenersRef.current.delete(id);
        const listenerIds = listenersMapRef.current.get(event) || [];
        const index = listenerIds.indexOf(id);

        if (index === -1) return;

        listenerIds.splice(index, 1);
        if (listenerIds.length === 0) {
          ws.off(event);
          listenersMapRef.current.delete(event);
        } else {
          listenersMapRef.current.set(event, listenerIds);
        }
      };
    },
    send: <
      TEvent extends Client2ServerEvents,
      TData = WSSchemas[TEvent]['data'],
      TReply = WSSchemas[TEvent]['reply'],
    >(
      event: TEvent,
      data: TData,
      callback?: TReply,
    ) => {
      let id: string | undefined;

      (ws.emit as (event: TEvent, data: TData) => void)(
        event,
        data as unknown as TData,
      );

      if (callback) {
        const replyEvent = `${event}/reply` as Server2ClientEvents;

        const handler = ((
          replyPayload: ReplyData<Record<keyof TReply, TSchema>>,
        ) => {
          const { type, data } = replyPayload;
          const fn = callback[type as keyof typeof callback];

          if (type === 'id') {
            id = data as string;
          }

          if (fn) {
            (fn as (data: unknown) => void)(data);
          }

          if (type === 'done') ws.off(replyEvent, handler as never);
        }) as never;

        ws.on(replyEvent, handler);
      }

      return () => {
        if (id) {
          ws.emit('unsubscribe', id);
        }
      };
    },
  };
}

export { useWS };
