import { createSelectors } from '@frontend/helper/store';
import type { WSClient2ServerEvents } from '@frontend/lib/ws';
import ws from '@frontend/lib/ws';
import type { Store } from '@frontend/types/store';
import type { WSSchemas } from '@vlab/shared/schemas/ws';
import type { ReplyData } from '@vlab/shared/types';
import type { MaybePromise, TSchema } from 'elysia';
import { create } from 'zustand';
import { useAuthStore } from './auth-store';

type Client2ServerEvents = keyof WSClient2ServerEvents;

interface WSActions {
  subscribe: <TData = unknown>(
    topicName: string,
    room: string,
    callback: (data: TData) => MaybePromise<void>,
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
  const listenersMap = new Map<string, string[]>();

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

    if (listeners.size) {
      ws.off('topic');
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
      subscribe: (topicName, room, callback) => {
        const key = `${topicName}:${room}`;
        const isFirstListener = !listenersMap.has(key);

        // Register the global topic event listener once
        if (!listeners.size) {
          ws.on('topic', (payload) => {
            const topicKey = `${payload.topic}:${payload.room}`;
            const listenerIds = listenersMap.get(topicKey) || [];

            for (const listenerId of listenerIds) {
              listeners.get(listenerId)?.(payload.data as never);
            }
          });
        }

        // Add callback to the listeners for this topic:room
        const id = crypto.randomUUID();
        listeners.set(id, callback as never);

        if (!listenersMap.has(key)) {
          listenersMap.set(key, []);
        }
        listenersMap.get(key)!.push(id);

        // Send subscription to server if this is the first listener
        if (isFirstListener) {
          ws.emit('topic/subscribe', { topic: topicName, room });
        }

        // Return cleanup function
        return () => {
          listeners.delete(id);
          const listenerIds = listenersMap.get(key);
          if (listenerIds) {
            const index = listenerIds.indexOf(id);
            if (index !== -1) {
              listenerIds.splice(index, 1);
            }
            // Clean up empty arrays and unsubscribe from server
            if (listenerIds.length === 0) {
              listenersMap.delete(key);
              ws.emit('topic/unsubscribe', { topic: topicName, room });
            }
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

          ws.off(replyEvent);
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
