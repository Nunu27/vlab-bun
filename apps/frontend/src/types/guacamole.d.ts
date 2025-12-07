declare module 'guacamole-common-js' {
  export namespace Guacamole {
    class Client {
      constructor(tunnel: Tunnel);
      connect(data?: string): void;
      disconnect(): void;
      sendMouseState(mouseState: Mouse.State): void;
      sendKeyEvent(pressed: number, keysym: number): void;
      sendSize(width: number, height: number): void;
      getDisplay(): Display;
      onstatechange: ((state: number) => void) | null;
      onerror: ((status: Status) => void) | null;
    }

    namespace Client {
      enum State {
        IDLE = 0,
        CONNECTING = 1,
        WAITING = 2,
        CONNECTED = 3,
        DISCONNECTING = 4,
        DISCONNECTED = 5,
      }
    }

    class Display {
      getElement(): HTMLElement;
    }

    class Tunnel {}

    class WebSocketTunnel extends Tunnel {
      constructor(url: string);
    }

    class Mouse {
      constructor(element: HTMLElement);
      currentState: Mouse.State;
      onmousedown: (() => void) | null;
      onmouseup: (() => void) | null;
      onmousemove: (() => void) | null;
      onEach(events: string[], handler: () => void): void;
      offEach(events: string[], handler: () => void): void;
    }

    namespace Mouse {
      interface State {
        x: number;
        y: number;
        left: boolean;
        middle: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
      }
    }

    class Keyboard {
      constructor(element: Element | Document);
      onkeydown: ((keysym: number) => void) | null;
      onkeyup: ((keysym: number) => void) | null;
    }

    interface Status {
      code: number;
      message?: string;
    }

    namespace Status {
      enum Code {
        SUCCESS = 0x0000,
        UNSUPPORTED = 0x0100,
        SERVER_ERROR = 0x0200,
        SERVER_BUSY = 0x0201,
        UPSTREAM_TIMEOUT = 0x0202,
        UPSTREAM_ERROR = 0x0203,
        RESOURCE_NOT_FOUND = 0x0204,
        RESOURCE_CONFLICT = 0x0205,
        RESOURCE_CLOSED = 0x0206,
        UPSTREAM_NOT_FOUND = 0x0207,
        UPSTREAM_UNAVAILABLE = 0x0208,
        SESSION_CONFLICT = 0x0209,
        SESSION_TIMEOUT = 0x020a,
        SESSION_CLOSED = 0x020b,
        CLIENT_BAD_REQUEST = 0x0300,
        CLIENT_UNAUTHORIZED = 0x0301,
        CLIENT_FORBIDDEN = 0x0303,
        CLIENT_TIMEOUT = 0x0308,
        CLIENT_OVERRUN = 0x030d,
        CLIENT_BAD_TYPE = 0x030f,
        CLIENT_TOO_MANY = 0x031d,
      }
    }
  }

  export default Guacamole;
}
