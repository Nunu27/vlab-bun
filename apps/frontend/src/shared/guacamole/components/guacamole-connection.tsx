import React, { useRef } from 'react';
import { useGuacamoleClient } from '../hooks/use-guacamole-client';
import { useGuacamoleClipboard } from '../hooks/use-guacamole-clipboard';
import { useGuacamoleKeyboard } from '../hooks/use-guacamole-keyboard';
import { useGuacamoleMouse } from '../hooks/use-guacamole-mouse';
import { useGuacamoleResize } from '../hooks/use-guacamole-resize';
import { useGuacamoleConnectionStore } from '../stores/guacamole-connection-store';
import { GuacamoleConnectionStates } from './guacamole-connection-states';

interface GuacamoleConnectionProps {
  token: string;
  onDisconnect?: () => void;
  onConnect?: () => void;
  onError?: (message: string) => void;
}

const GuacamoleConnection: React.FC<GuacamoleConnectionProps> = ({
  token,
  onDisconnect,
  onConnect,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const store = useGuacamoleConnectionStore();

  const state = store.use.state();
  const errorMessage = store.use.errorMessage();
  const isConnected = store.use.isConnected();

  // Initialize Guacamole client
  const { clientRef, displayElementRef } = useGuacamoleClient({
    token,
    displayContainerRef: containerRef,
    onConnect,
    onDisconnect,
    onError,
  });

  // Setup resize handling
  useGuacamoleResize({
    clientRef,
    containerRef,
    isConnected,
  });

  // Setup mouse handling
  useGuacamoleMouse({
    clientRef,
    displayElementRef,
    containerRef,
    isConnected,
  });

  // Setup keyboard handling
  useGuacamoleKeyboard({ clientRef, isConnected });

  // Setup clipboard handling
  useGuacamoleClipboard({ clientRef, isConnected });

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-900 outline-none focus:outline-none focus-visible:outline-none">
      <div
        ref={containerRef}
        id="guacamole-display-container"
        className="outline-none focus:outline-none focus-visible:outline-none"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: '#111',
          overflow: 'hidden',
          visibility: state === 'connected' ? 'visible' : 'hidden',
          cursor: state === 'connected' ? 'none' : 'default',
        }}
      />

      <GuacamoleConnectionStates state={state} errorMessage={errorMessage} />
    </div>
  );
};

export default GuacamoleConnection;
