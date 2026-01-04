import { createSelectors } from '@frontend/helper/store';
import type {
  WSClient2ServerEvents,
  WSServer2ClientEvents,
} from '@frontend/lib/ws';
import ws from '@frontend/lib/ws';
import type { Store } from '@frontend/types/store';
import type { WSSchemas } from '@vlab/shared/schemas';
import type { ReplyData } from '@vlab/shared/types';
import type { MaybePromise, TSchema } from 'elysia';
import { create } from 'zustand';
import { useAuthStore } from './auth';

type Server2ClientEvents = keyof WSServer2ClientEvents;
type Client2ServerEvents = keyof WSClient2ServerEvents;

interface WSActions {
  subscribe: <TEvent extends Server2ClientEvents>(
    event: TEvent,
    callback: (
      data: Parameters<WSServer2ClientEvents[TEvent]>[0],
    ) => MaybePromise<void>,
  ) => VoidFunction;
  send: <
    TEvent extends Client2ServerEvents,
    TData = WSSchemas[TEvent]['data'],
    TReply = WSSchemas[TEvent]['reply'],
  >(
    event: TEvent,
    data: TData,
    callback?: TReply,
  ) => VoidFunction;
}

interface WSState {
  connected: boolean;
}

type WSStore = Store<WSState, WSActions>;

const store = create<WSStore>()((set) => {
  const listeners = new Map<string, (data: never) => MaybePromise<void>>();
  const listenersMap = new Map<Server2ClientEvents, string[]>();

  const connect = () => {
    if (ws.listeners('connect').length) return;

    ws.connect();

    console.log('[WebSocket] Connecting...');

    ws.on('connect', () => {
      console.log('[WebSocket] Connected');
      set({ connected: true });
    });

    ws.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      set({ connected: false });
    });
  };

  const disconnect = () => {
    ws.disconnect();

    for (const event of listenersMap.keys()) {
      ws.off(event);
    }

    listeners.clear();
    listenersMap.clear();

    ws.off('connect');
    ws.off('disconnect');
  };

  useAuthStore.subscribe((state) => {
    const user = state.user;

    if (user) connect();
    else disconnect();
  });

  return {
    connected: false,
    actions: {
      subscribe: (event, callback) => {
        const id = Bun.randomUUIDv7();

        listeners.set(id, callback);
        if (!listenersMap.has(event)) {
          listenersMap.set(event, [id]);

          ws.on(event, ((
            data: Parameters<WSServer2ClientEvents[typeof event]>[0],
          ) => {
            const listenerIds = listenersMap.get(event) || [];

            for (const listenerId of listenerIds) {
              listeners.get(listenerId)?.(data as never);
            }
          }) as never);
        } else {
          listenersMap.get(event)?.push(id);
        }

        return () => {
          listeners.delete(id);
          const listenerIds = listenersMap.get(event) || [];
          const index = listenerIds.indexOf(id);

          if (index === -1) return;

          listenerIds.splice(index, 1);
          if (listenerIds.length === 0) {
            ws.off(event);
            listenersMap.delete(event);
          } else {
            listenersMap.set(event, listenerIds);
          }
        };
      },
      send: (event, data, callback) => {
        type TReply = typeof callback;

        let id: string | undefined;

        ws.emit(event, data);

        if (callback) {
          const replyEvent = `${event}/reply`;

          const handler = (
            replyPayload: ReplyData<Record<keyof TReply, TSchema>>,
          ) => {
            const { type, data } = replyPayload;
            const fn = callback[type as keyof typeof callback];

            if (type === 'id') {
              id = data;
            }

            if (typeof fn === 'function') fn(data);
            if (type === 'done') ws.off(replyEvent, handler);
          };

          ws.on(replyEvent, handler);
        }

        return () => {
          if (id) {
            ws.emit('unsubscribe', id);
          }
        };
      },
    },
  };
});

export const useWSStore = createSelectors(store);
