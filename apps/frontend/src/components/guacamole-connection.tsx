import React, { useEffect, useRef } from 'react';
import Guacamole from 'guacamole-common-js';

interface GuacamoleConnectionProps {
  token: string;
}

const GuacamoleConnection: React.FC<GuacamoleConnectionProps> = ({ token }) => {
  const displayContainerRef = useRef<HTMLDivElement>(null);
  const guacClientRef = useRef<Guacamole.Client | null>(null);
  const guacKeyboardRef = useRef<Guacamole.Keyboard | null>(null);
  const guacMouseRef = useRef<Guacamole.Mouse | null>(null);

  const isGuacConnectedRef = useRef(false);

  const onMouseEventRef = useRef<(() => void) | null>(null);

  useEffect(() => {
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
    } else {
      console.error(
        'React display container ref or Guacamole display element not found.',
      );
      if (guac) guac.disconnect();
      return;
    }

    guac.onstatechange = (state: number) => {
      const ClientState = Guacamole.Client.State;
      switch (state) {
        case ClientState.CONNECTING:
          console.log('Guacamole state: Connecting...');
          isGuacConnectedRef.current = false;
          break;
        case ClientState.CONNECTED: {
          console.log('Guacamole state: Connected.');
          isGuacConnectedRef.current = true;
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
          message = `Guacamole error (code 0x${error.code.toString(16)}): ${
            error.message || 'Unknown'
          }`;
      }

      // alert(`Connection Error: ${message}`);
      console.error(`Connection Error: ${message}`);
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

    const mouse = new Guacamole.Mouse(displayElement);

    onMouseEventRef.current = () => {
      if (isGuacConnectedRef.current && guacClientRef.current) {
        guacClientRef.current.sendMouseState(mouse.currentState);
      }
    };

    try {
      mouse.onEach(
        ['mouseup', 'mousedown', 'mousemove'],
        onMouseEventRef.current,
      );
    } catch (e) {
      console.warn(
        'Mouse.onEach is not available, falling back to individual handlers.',
        e,
      );
      mouse.onmousedown =
        mouse.onmouseup =
        mouse.onmousemove =
          onMouseEventRef.current;
    }
    guacMouseRef.current = mouse;

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

      if (guacMouseRef.current && onMouseEventRef.current) {
        try {
          guacMouseRef.current.offEach(
            ['mouseup', 'mousedown', 'mousemove'],
            onMouseEventRef.current,
          );
        } catch {
          // Fallback cleanup
          if (guacMouseRef.current) {
            guacMouseRef.current.onmousedown = null;
            guacMouseRef.current.onmouseup = null;
            guacMouseRef.current.onmousemove = null;
          }
        }
      }
      guacMouseRef.current = null;

      if (container && displayElement && container.contains(displayElement)) {
        container.removeChild(displayElement);
      }
    };
  }, [token]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-900">
      <div
        ref={displayContainerRef}
        id="guacamole-display-container"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: '#111',
          overflow: 'hidden',
        }}
      />
    </div>
  );
};

export default GuacamoleConnection;
