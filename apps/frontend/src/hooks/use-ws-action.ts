import type { WSClient2ServerEvents } from '@frontend/lib/ws';
import { useWSStore } from '@frontend/stores/ws';
import type { WSSchemas } from '@vlab/shared/schemas';
import { useEffect, useRef } from 'react';

export function useWSAction<
  TEvent extends keyof WSClient2ServerEvents,
  TData = WSSchemas[TEvent]['data'],
  TReply = WSSchemas[TEvent]['reply'],
>(event: TEvent) {
  const { send } = useWSStore.use.actions();
  const unsubRef = useRef<VoidFunction | null>(null);

  const dispose = () => {
    unsubRef.current?.();
    unsubRef.current = null;
  };

  useEffect(() => {
    return dispose;
  }, []);

  return {
    send: (data: TData, callback?: TReply) => {
      unsubRef.current?.();
      const unsub = send(event, data, callback);
      unsubRef.current = unsub;
    },
    dispose,
  };
}
