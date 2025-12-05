import type { ReplyData } from '@backend/types/ws';
import ws, {
  type WSClient2ServerEvents,
  type WSServer2ClientEvents,
} from '@frontend/lib/ws';
import { useQuery } from '@tanstack/react-query';
import type { MaybePromise } from 'elysia';
import { randomId } from 'elysia/utils';
import { useEffect, useRef, useState } from 'react';
import { authQueryOptions } from './use-auth';

type Server2ClientEvents = keyof WSServer2ClientEvents;
type Client2ServerEvents = keyof WSClient2ServerEvents;

type ExtractReplyCallbacks<T> =
  T extends ReplyData<infer TReply>
    ? Partial<
        {
          [K in keyof TReply]: (data: TReply[K]) => MaybePromise<void>;
        } & {
          done?: () => MaybePromise<void>;
        }
      >
    : never;

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
      const id = randomId();

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
    send: <TEvent extends Client2ServerEvents>(
      event: TEvent,
      data: Parameters<WSClient2ServerEvents[TEvent]>[0],
      callback?: `${TEvent}/reply` extends Server2ClientEvents
        ? ExtractReplyCallbacks<
            Parameters<WSServer2ClientEvents[`${TEvent}/reply`]>[0]
          >
        : never,
    ) => {
      (
        ws.emit as (
          event: TEvent,
          data: Parameters<WSClient2ServerEvents[TEvent]>[0],
        ) => void
      )(event, data);

      if (callback) {
        const replyEvent = `${event}/reply` as Server2ClientEvents;

        const handler = ((replyPayload: ReplyData<never>) => {
          const { type, data } = replyPayload;
          const fn = callback[type as keyof typeof callback];

          if (fn) {
            fn(data as never);
          }

          if (type === 'done') ws.off(replyEvent, handler as never);
        }) as never;

        ws.on(replyEvent, handler);
      }
    },
  };
}

export { useWS };
