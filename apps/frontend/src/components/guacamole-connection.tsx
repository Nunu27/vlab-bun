import Guacamole from 'guacamole-common-js';
import { AlertCircle, Loader2 } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';

interface GuacamoleConnectionProps {
  token: string;
  onDisconnect?: () => void;
  onConnect?: () => void;
  onError?: (message: string) => void;
}

type ConnectionState = 'connecting' | 'connected' | 'error' | 'disconnected';

const GuacamoleConnection: React.FC<GuacamoleConnectionProps> = ({
  token,
  onDisconnect,
  onConnect,
  onError,
}) => {
  const displayContainerRef = useRef<HTMLDivElement>(null);
  const guacClientRef = useRef<Guacamole.Client | null>(null);
  const guacKeyboardRef = useRef<Guacamole.Keyboard | null>(null);
  const displayElementRef = useRef<HTMLElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const sizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isGuacConnectedRef = useRef(false);
  const hasErrorRef = useRef(false);

  // Refs for callbacks to avoid re-connecting on prop changes
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

  useEffect(() => {
    onDisconnectRef.current = onDisconnect;
  }, [onDisconnect]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Debounced size update to prevent excessive calls
  const sendSize = useCallback(() => {
    if (sizeTimeoutRef.current) {
      clearTimeout(sizeTimeoutRef.current);
    }

    sizeTimeoutRef.current = setTimeout(() => {
      if (
        displayContainerRef.current &&
        guacClientRef.current &&
        isGuacConnectedRef.current
      ) {
        const width = Math.floor(displayContainerRef.current.clientWidth);
        const height = Math.floor(displayContainerRef.current.clientHeight);
        if (width > 0 && height > 0) {
          console.log(`Sending size: ${width}x${height}`);
          guacClientRef.current.sendSize(width, height);
        }
      }
    }, 100);
  }, []);

  // Memoized mouse state handler
  const sendMouseState = useCallback(
    (clientX: number, clientY: number, buttons: number) => {
      const client = guacClientRef.current;
      const container = displayContainerRef.current;

      if (!isGuacConnectedRef.current || !client || !container) return;

      const rect = container.getBoundingClientRect();
      const x = Math.floor(clientX - rect.left);
      const y = Math.floor(clientY - rect.top);

      const clampedX = Math.max(0, Math.min(x, Math.floor(rect.width) - 1));
      const clampedY = Math.max(0, Math.min(y, Math.floor(rect.height) - 1));

      const state = new Guacamole.Mouse.State();
      state.x = clampedX;
      state.y = clampedY;
      state.left = !!(buttons & 1);
      state.middle = !!(buttons & 4);
      state.right = !!(buttons & 2);
      state.up = !!(buttons & 8);
      state.down = !!(buttons & 16);

      client.sendMouseState(state);
    },
    [],
  );

  // Error handler
  const handleGuacError = useCallback((error: Guacamole.Status) => {
    console.error('Guacamole client error:', error);
    isGuacConnectedRef.current = false;
    hasErrorRef.current = true;

    const StatusCodes = Guacamole.Status.Code;
    let message: string;

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
        message = `Guacamole error (code 0x${error.code.toString(16)}): ${
          error.message || 'Unknown'
        }`;
    }

    console.error(`Connection Error: ${message}`);
    setConnectionState('error');
    setErrorMessage(message);
    onErrorRef.current?.(message);

    guacClientRef.current?.disconnect();
  }, []);

  useEffect(() => {
    setConnectionState('connecting');
    setErrorMessage(null);
    hasErrorRef.current = false;
    isGuacConnectedRef.current = false;

    const tunnel = new Guacamole.WebSocketTunnel('/display');
    const guac = new Guacamole.Client(tunnel);
    guacClientRef.current = guac;

    const displayElement = guac.getDisplay().getElement();
    displayElementRef.current = displayElement;
    // Capture refs for cleanup
    const displayContainer = displayContainerRef.current;

    if (!displayContainer || !displayElement) {
      console.error(
        'Display container ref or Guacamole display element not found.',
      );
      setConnectionState('error');
      setErrorMessage('Display container not found');
      guac.disconnect();
      return;
    }

    // Clear and append display element
    displayContainer.innerHTML = '';
    displayContainer.appendChild(displayElement);
    displayElement.style.outline = 'none';
    displayElement.style.zIndex = '10';

    // State change handler
    guac.onstatechange = (state: number) => {
      const ClientState = Guacamole.Client.State;

      switch (state) {
        case ClientState.CONNECTING:
          console.log('Guacamole state: Connecting...');
          setConnectionState('connecting');
          isGuacConnectedRef.current = false;
          break;

        case ClientState.CONNECTED:
          console.log('Guacamole state: Connected.');
          setConnectionState('connected');
          isGuacConnectedRef.current = true;
          onConnectRef.current?.();
          sendSize(); // Single debounced size update
          break;

        case ClientState.DISCONNECTING:
          console.log('Guacamole state: Disconnecting...');
          break;

        case ClientState.DISCONNECTED:
          console.log('Guacamole state: Disconnected.');
          isGuacConnectedRef.current = false;
          if (!hasErrorRef.current) {
            setConnectionState('disconnected');
            onDisconnectRef.current?.();
          }
          break;

        case ClientState.WAITING:
          console.log('Guacamole state: Waiting for server response...');
          isGuacConnectedRef.current = false;
          break;

        case ClientState.IDLE:
          console.log('Guacamole state: Idle.');
          break;
      }
    };

    guac.onerror = handleGuacError;

    // Clipboard handling
    guac.onclipboard = (stream: Guacamole.InputStream, mimetype: string) => {
      if (/^text\//.test(mimetype)) {
        const reader = new Guacamole.StringReader(stream);
        let data = '';
        reader.ontext = (text: string) => {
          data += text;
        };
        reader.onend = () => {
          navigator.clipboard.writeText(data).catch((err) => {
            console.error('Failed to write to clipboard:', err);
          });
        };
      }
    };

    // Connect
    try {
      guac.connect('token=' + token);
    } catch (e) {
      console.error('Error on guac.connect():', e);
      return;
    }

    // Mouse event handlers
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
      guacClientRef.current?.getDisplay().showCursor(true);
      sendMouseState(e.clientX, e.clientY, e.buttons);
    };

    const handleMouseLeave = () => {
      const client = guacClientRef.current;
      if (!isGuacConnectedRef.current || !client) return;

      client.getDisplay().showCursor(false);

      const state = new Guacamole.Mouse.State();
      state.x = -1;
      state.y = -1;
      state.left = false;
      state.middle = false;
      state.right = false;
      state.up = false;
      state.down = false;
      client.sendMouseState(state);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY === 0) return;

      const mask = e.deltaY < 0 ? 8 : 16;
      sendMouseState(e.clientX, e.clientY, e.buttons | mask);
      sendMouseState(e.clientX, e.clientY, e.buttons);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const sendClipboardText = (text: string) => {
      const client = guacClientRef.current;
      if (!text || !client) return;

      const stream = client.createClipboardStream('text/plain');
      const writer = new Guacamole.StringWriter(stream);
      for (let i = 0; i < text.length; i += 4096) {
        writer.sendText(text.slice(i, i + 4096));
      }
      writer.sendEnd();
    };

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text/plain');
      if (text) {
        console.log('Sending clipboard data to remote:', text.length, 'chars');
        sendClipboardText(text);
      }
    };

    const handleWindowFocus = () => {
      if (!isGuacConnectedRef.current || !guacClientRef.current) return;

      navigator.clipboard
        .readText()
        .then((text) => {
          if (text) {
            console.log('Syncing clipboard on focus:', text.length, 'chars');
            sendClipboardText(text);
          }
        })
        .catch((err) => {
          console.debug('Clipboard read failed (focus sync):', err);
        });
    };

    // Attach event listeners
    displayElement.addEventListener('mousedown', handleMouseDown);
    displayElement.addEventListener('mouseup', handleMouseUp);
    displayElement.addEventListener('mousemove', handleMouseMove);
    displayElement.addEventListener('mouseleave', handleMouseLeave);
    displayElement.addEventListener('wheel', handleWheel, { passive: false });
    displayElement.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('focus', handleWindowFocus);

    // Keyboard setup
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

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (isGuacConnectedRef.current) {
        sendSize();
      }
    });
    resizeObserverRef.current = resizeObserver;

    if (displayContainer) {
      resizeObserver.observe(displayContainer);
    }

    // Cleanup function
    return () => {
      if (sizeTimeoutRef.current) {
        clearTimeout(sizeTimeoutRef.current);
      }

      // Use captured values from effect scope
      if (resizeObserverRef.current && displayContainer) {
        resizeObserverRef.current.unobserve(displayContainer);
        resizeObserverRef.current.disconnect();
      }

      if (guacClientRef.current) {
        guacClientRef.current.onstatechange = null;
        guacClientRef.current.onerror = null;
        guacClientRef.current.disconnect();
      }

      if (guacKeyboardRef.current) {
        guacKeyboardRef.current.onkeydown = null;
        guacKeyboardRef.current.onkeyup = null;
      }

      if (displayElement) {
        displayElement.removeEventListener('mousedown', handleMouseDown);
        displayElement.removeEventListener('mouseup', handleMouseUp);
        displayElement.removeEventListener('mousemove', handleMouseMove);
        displayElement.removeEventListener('mouseleave', handleMouseLeave);
        displayElement.removeEventListener('wheel', handleWheel);
        displayElement.removeEventListener('contextmenu', handleContextMenu);
      }

      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('focus', handleWindowFocus);

      if (
        displayContainer &&
        displayElement &&
        displayContainer.contains(displayElement)
      ) {
        displayContainer.removeChild(displayElement);
      }

      guacClientRef.current = null;
      guacKeyboardRef.current = null;
      displayElementRef.current = null;
      resizeObserverRef.current = null;
    };
  }, [token, handleGuacError, sendMouseState, sendSize]);

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
          <div className="space-y-1 text-center">
            <p className="font-medium text-slate-200">Connecting to Device</p>
            <p className="font-mono text-xs text-slate-500">
              Establishing secure tunnel...
            </p>
          </div>
        </div>
      )}

      {connectionState === 'disconnected' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-gray-900 text-white">
          <div className="space-y-1 px-8 text-center">
            <p className="font-medium text-slate-400">Session Ended</p>
          </div>
        </div>
      )}

      {connectionState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-gray-900 text-white">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <div className="space-y-1 px-8 text-center">
            <p className="font-medium text-red-400">Connection Failed</p>
            <p className="text-sm text-slate-400">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuacamoleConnection;
