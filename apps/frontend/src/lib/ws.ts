import type {
  Client2ServerEvents,
  InterServerEvents,
  Server2ClientEvents,
} from '@vlab/shared/schemas';
import { io, type Socket } from 'socket.io-client';
import parser from 'socket.io-msgpack-parser';

export type WSServer2ClientEvents = Server2ClientEvents & InterServerEvents;
export type WSClient2ServerEvents = Client2ServerEvents & InterServerEvents;

export type WSClient = Socket<WSServer2ClientEvents, WSClient2ServerEvents>;

const ws: WSClient = io(window.location.origin, {
  parser,
  path: '/ws',
  autoConnect: false,
  transports: ['websocket', 'polling', 'webtransport'],
  auth: async (cb) => {
    const session = await cookieStore.get('session');

    return cb({
      session: session?.value,
    });
  },
});

ws.on('connect_error', (err) => {
  console.error('[WebSocket] Connection Error:', err.message);
});

ws.on('error', (data) => {
  console.error('[WebSocket] Error:', data);
});

export default ws;
