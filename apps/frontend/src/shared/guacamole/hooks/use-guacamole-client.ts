import Guacamole from 'guacamole-common-js';
import { useEffect, useRef, type RefObject } from 'react';
import { useGuacamoleConnectionStore } from '../stores/guacamole-connection-store';
import { getGuacamoleErrorMessage } from '../utils';
import { useWSStore } from '@frontend/stores/ws-store';

interface UseGuacamoleClientProps {
  token: string;
  displayContainerRef: RefObject<HTMLDivElement | null>;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (message: string) => void;
}

export const useGuacamoleClient = ({
  token,
  displayContainerRef,
  onConnect,
  onDisconnect,
  onError,
}: UseGuacamoleClientProps) => {
  const clientRef = useRef<Guacamole.Client | null>(null);
  const displayElementRef = useRef<HTMLElement | null>(null);

  const connected = useWSStore.use.connected();
  const store = useGuacamoleConnectionStore();
  const { setState, setError, setConnected, reset } = store.use.actions();

  useEffect(() => {
    reset();

    if (!connected) {
      setError('Server not connected');
      return;
    }

    const tunnel = new Guacamole.WebSocketTunnel('/display');
    const client = new Guacamole.Client(tunnel);
    clientRef.current = client;

    const displayElement = client.getDisplay().getElement();
    displayElementRef.current = displayElement;
    const displayContainer = displayContainerRef.current;

    if (!displayContainer || !displayElement) {
      console.error(
        'Display container ref or Guacamole display element not found.',
      );
      setError('Display container not found');
      client.disconnect();
      return;
    }

    // Clear and append display element
    displayContainer.innerHTML = '';
    displayContainer.appendChild(displayElement);
    displayElement.style.outline = 'none';
    displayElement.style.zIndex = '10';

    // State change handler
    client.onstatechange = (state) => {
      const ClientState = Guacamole.Client.State;

      switch (state) {
        case ClientState.CONNECTING:
          console.log('Guacamole state: Connecting...');
          setState('connecting');
          break;

        case ClientState.CONNECTED:
          console.log('Guacamole state: Connected.');
          setState('connected');
          onConnect?.();
          break;

        case ClientState.DISCONNECTING:
          console.log('Guacamole state: Disconnecting...');
          break;

        case ClientState.DISCONNECTED:
          console.log('Guacamole state: Disconnected.');
          if (!store.getState().hasError) {
            setState('disconnected');
            onDisconnect?.();
          }
          break;

        case ClientState.WAITING:
          console.log('Guacamole state: Waiting for server response...');
          setConnected(false);
          break;

        case ClientState.IDLE:
          console.log('Guacamole state: Idle.');
          break;
      }
    };

    // Error handler
    client.onerror = (error) => {
      console.error('Guacamole client error:', error);
      const message = getGuacamoleErrorMessage(error);
      console.error(`Connection Error: ${message}`);
      setError(message);
      onError?.(message);
      client.disconnect();
    };

    // Connect
    try {
      client.connect('token=' + token);
    } catch (e) {
      console.error('Error on client.connect():', e);
      setError('Failed to initiate connection');
      return;
    }

    // Cleanup
    return () => {
      if (client) {
        client.onstatechange = null;
        client.onerror = null;
        client.disconnect();
      }

      if (
        displayContainer &&
        displayElement &&
        displayContainer.contains(displayElement)
      ) {
        displayContainer.removeChild(displayElement);
      }

      clientRef.current = null;
      displayElementRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, connected]);

  return { clientRef, displayElementRef };
};
