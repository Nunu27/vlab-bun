import React, { useEffect, useRef, useState } from 'react';
import Guacamole from 'guacamole-common-js';
import { Loader2, AlertCircle } from 'lucide-react';

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
  onError
}) => {
  const displayContainerRef = useRef<HTMLDivElement>(null);
  const guacClientRef = useRef<Guacamole.Client | null>(null);
  const guacKeyboardRef = useRef<Guacamole.Keyboard | null>(null);
  const guacMouseRef = useRef<Guacamole.Mouse | null>(null);

  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isGuacConnectedRef = useRef(false);

  useEffect(() => {
    setConnectionState('connecting');
    setErrorMessage(null);

    const tunnel = new Guacamole.WebSocketTunnel('/display');
    const guac = new Guacamole.Client(tunnel);
    guacClientRef.current = guac;

    const displayElement = guac.getDisplay().getElement();
    const displayContainer = displayContainerRef.current;

    if (displayContainer && displayElement) {
      while (displayContainer.firstChild) {
        displayContainer.removeChild(displayContainer.firstChild);
      }
      displayContainer.appendChild(displayElement);
      displayElement.style.outline = 'none';
    } else {
      console.error(
        'React display container ref or Guacamole display element not found.',
      );
      setConnectionState('error');
      setErrorMessage('Display container not found');
      if (guac) guac.disconnect();
      return;
    }

    guac.onstatechange = (state: number) => {
      const ClientState = Guacamole.Client.State;
      switch (state) {
        case ClientState.CONNECTING:
          console.log('Guacamole state: Connecting...');
          setConnectionState('connecting');
          isGuacConnectedRef.current = false;
          break;
        case ClientState.CONNECTED: {
          console.log('Guacamole state: Connected.');
          setConnectionState('connected');
          isGuacConnectedRef.current = true;
          onConnect?.();

          // Send initial size when connected with small delays to ensure it takes effect
          const sendInitialSize = () => {
            if (displayContainerRef.current && guacClientRef.current) {
              const width = Math.floor(displayContainerRef.current.clientWidth);
              const height = Math.floor(
                displayContainerRef.current.clientHeight,
              );
              if (width > 0 && height > 0) {
                console.log(`Sending initial size: ${width}x${height}`);
                guacClientRef.current.sendSize(width, height);
              }
            }
          };
          // Send immediately
          sendInitialSize();
          // Send again after delays to ensure it takes effect
          setTimeout(sendInitialSize, 100);
          setTimeout(sendInitialSize, 300);
          setTimeout(sendInitialSize, 5000);
          break;
        }
        case ClientState.DISCONNECTING:
          console.log('Guacamole state: Disconnecting...');
          break;
        case ClientState.DISCONNECTED:
          console.log('Guacamole state: Disconnected.');
          isGuacConnectedRef.current = false;
          setConnectionState('error');
          setErrorMessage('Session Disconnected');
          onDisconnect?.();
          break;
        case ClientState.WAITING:
          console.log('Guacamole state: Waiting for server response...');
          isGuacConnectedRef.current = false;
          break;
        case ClientState.IDLE:
          console.log('Guacamole state: Idle.');
      }
    };

    guac.onerror = (error: Guacamole.Status) => {
      console.error('Guacamole client error:', error);
      isGuacConnectedRef.current = false;
      let message = 'Connection error.';

      const StatusCodes = Guacamole.Status.Code;
      switch (error.code) {
        case StatusCodes.UPSTREAM_TIMEOUT:
          message = 'Server timeout.';
          break;
        case StatusCodes.UPSTREAM_ERROR:
          message = 'Upstream server error.';
          break;
        case StatusCodes.RESOURCE_NOT_FOUND:
          message = 'Resource not found.';
          break;
        case StatusCodes.CLIENT_BAD_REQUEST:
          message = 'Client sent a bad request.';
          break;
        case StatusCodes.CLIENT_UNAUTHORIZED:
          message = 'Permission Denied. Check token/permissions.';
          break;
        case StatusCodes.CLIENT_FORBIDDEN:
          message = 'Forbidden.';
          break;
        default:
          message = `Guacamole error (code 0x${error.code.toString(16)}): ${error.message || 'Unknown'
            }`;
      }

      // alert(`Connection Error: ${message}`);
      console.error(`Connection Error: ${message}`);
      setConnectionState('error');
      setErrorMessage(message);
      onError?.(message);

      if (guacClientRef.current) {
        guacClientRef.current.disconnect();
      }
    };

    try {
      guac.connect('token=' + token);
      const element = guac.getDisplay().getElement();
      element.style.zIndex = '10';
    } catch (e) {
      console.error('Error on guac.connect():', e);
      return;
    }

    // Custom mouse state handler - calculates position relative to container bounds
    // Custom mouse state handler
    const sendMouseState = (clientX: number, clientY: number, buttons: number) => {
      if (!isGuacConnectedRef.current || !guacClientRef.current || !displayContainerRef.current) return;

      // Calculate position relative to container (modal-safe)
      const rect = displayContainerRef.current.getBoundingClientRect();
      const x = Math.floor(clientX - rect.left);
      const y = Math.floor(clientY - rect.top);

      // Clamp to container bounds
      const clampedX = Math.max(0, Math.min(x, Math.floor(rect.width) - 1));
      const clampedY = Math.max(0, Math.min(y, Math.floor(rect.height) - 1));

      // Create state and set position directly
      const state = new Guacamole.Mouse.State();
      state.x = clampedX;
      state.y = clampedY;

      // Set button states from e.buttons bitmask
      state.left = !!(buttons & 1);    // Left button (bit 0)
      state.middle = !!(buttons & 4);  // Middle button (bit 2)  
      state.right = !!(buttons & 2);   // Right button (bit 1)
      state.up = !!(buttons & 8);      // Scroll up (bit 3)
      state.down = !!(buttons & 16);   // Scroll down (bit 4)

      // Forward to Guacamole
      guacClientRef.current.sendMouseState(state);
    };


    // Mouse event handlers using clientX/Y directly
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      sendMouseState(e.clientX, e.clientY, e.buttons);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      sendMouseState(e.clientX, e.clientY, e.buttons);
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      sendMouseState(e.clientX, e.clientY, e.buttons);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY === 0) return;

      const mask = e.deltaY < 0 ? 8 : 16; // 8 for up, 16 for down

      // Send press
      sendMouseState(e.clientX, e.clientY, e.buttons | mask);
      // Send release
      sendMouseState(e.clientX, e.clientY, e.buttons);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Attach handlers directly to display element
    displayElement.addEventListener('mousedown', handleMouseDown);
    displayElement.addEventListener('mouseup', handleMouseUp);
    displayElement.addEventListener('mousemove', handleMouseMove);
    displayElement.addEventListener('wheel', handleWheel, { passive: false });
    displayElement.addEventListener('contextmenu', handleContextMenu);

    // Store for cleanup
    guacMouseRef.current = {
      cleanup: () => {
        displayElement.removeEventListener('mousedown', handleMouseDown);
        displayElement.removeEventListener('mouseup', handleMouseUp);
        displayElement.removeEventListener('mousemove', handleMouseMove);
        displayElement.removeEventListener('wheel', handleWheel);
        displayElement.removeEventListener('contextmenu', handleContextMenu);
      }
    } as any;

    const keyboard = new Guacamole.Keyboard(document);
    keyboard.onkeydown = (keysym: number) => {
      if (isGuacConnectedRef.current && guacClientRef.current) {
        guacClientRef.current.sendKeyEvent(1, keysym);
      }
    };
    keyboard.onkeyup = (keysym: number) => {
      if (isGuacConnectedRef.current && guacClientRef.current) {
        guacClientRef.current.sendKeyEvent(0, keysym);
      }
    };
    guacKeyboardRef.current = keyboard;

    const resizeObserver = new ResizeObserver((entries) => {
      if (
        isGuacConnectedRef.current &&
        guacClientRef.current &&
        entries.length > 0 &&
        displayContainerRef.current
      ) {
        const entry = entries[0];
        if (entry) {
          const width = Math.floor(entry.contentRect.width);
          const height = Math.floor(entry.contentRect.height);
          if (width > 0 && height > 0) {
            guacClientRef.current.sendSize(width, height);
          }
        }
      }
    });

    if (displayContainerRef.current) {
      resizeObserver.observe(displayContainerRef.current);
    }

    return () => {
      const containerRef = displayContainerRef;
      const container = containerRef.current;

      if (resizeObserver && container) {
        resizeObserver.unobserve(container);
      }
      if (guacClientRef.current) {
        guacClientRef.current.disconnect();
      }

      if (guacKeyboardRef.current) {
        guacKeyboardRef.current.onkeydown = null;
        guacKeyboardRef.current.onkeyup = null;
      }
      guacKeyboardRef.current = null;

      if (guacMouseRef.current && (guacMouseRef.current as any).cleanup) {
        (guacMouseRef.current as any).cleanup();
      }
      guacMouseRef.current = null;

      if (container && displayElement && container.contains(displayElement)) {
        container.removeChild(displayElement);
      }
    };
  }, [token]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-900 outline-none focus:outline-none focus-visible:outline-none">
      <div
        ref={displayContainerRef}
        id="guacamole-display-container"
        className="outline-none focus:outline-none focus-visible:outline-none"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: '#111',
          overflow: 'hidden',
          visibility: connectionState === 'connected' ? 'visible' : 'hidden',
          cursor: connectionState === 'connected' ? 'none' : 'default',
        }}
      />

      {connectionState === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-gray-900 text-white">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 blur-xl"></div>
            <Loader2 className="relative z-10 h-12 w-12 animate-spin text-blue-500" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-medium text-slate-200">Connecting to Desktop</p>
            <p className="font-mono text-xs text-slate-500">Establishing secure tunnel...</p>
          </div>
        </div>
      )}

      {connectionState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-gray-900 text-white">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <div className="text-center space-y-1 px-8">
            <p className="font-medium text-red-400">Connection Failed</p>
            <p className="text-sm text-slate-400">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuacamoleConnection;
