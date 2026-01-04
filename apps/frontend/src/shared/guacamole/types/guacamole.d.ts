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
      createClipboardStream(mimetype: string): OutputStream;
      onstatechange: ((state: number) => void) | null;
      onerror: ((status: Status) => void) | null;
      onclipboard: ((stream: InputStream, mimetype: string) => void) | null;
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
      // Properties
      cursorHotspotX: number;
      cursorHotspotY: number;
      cursorX: number;
      cursorY: number;
      statisticWindow: number;

      // Event handlers
      oncursor:
        | ((canvas: HTMLCanvasElement, x: number, y: number) => void)
        | null;
      onresize: ((width: number, height: number) => void) | null;
      onstatistics: ((stats: Display.Statistics) => void) | null;

      // Methods - Basic
      getElement(): HTMLElement;
      getWidth(): number;
      getHeight(): number;
      getDefaultLayer(): Display.VisibleLayer;
      getCursorLayer(): Display.VisibleLayer;
      createLayer(): Display.VisibleLayer;
      createBuffer(): Layer;

      // Methods - Frame management
      flush(
        callback?: () => void,
        timestamp?: number,
        logicalFrames?: number,
      ): void;
      cancel(): void;

      // Methods - Cursor
      setCursor(
        hotspotX: number,
        hotspotY: number,
        layer: Layer,
        srcx: number,
        srcy: number,
        srcw: number,
        srch: number,
      ): void;
      showCursor(shown?: boolean): void;
      moveCursor(x: number, y: number): void;

      // Methods - Layer operations
      resize(layer: Layer, width: number, height: number): void;

      // Methods - Drawing images
      drawImage(
        layer: Layer,
        x: number,
        y: number,
        image: CanvasImageSource,
      ): void;
      drawBlob(layer: Layer, x: number, y: number, blob: Blob): void;
      drawStream(
        layer: Layer,
        x: number,
        y: number,
        stream: InputStream,
        mimetype: string,
      ): void;
      draw(layer: Layer, x: number, y: number, url: string): void;

      // Methods - Video
      play(layer: Layer, mimetype: string, duration: number, url: string): void;

      // Methods - Copy operations
      put(
        srcLayer: Layer,
        srcx: number,
        srcy: number,
        srcw: number,
        srch: number,
        dstLayer: Layer,
        x: number,
        y: number,
      ): void;
      copy(
        srcLayer: Layer,
        srcx: number,
        srcy: number,
        srcw: number,
        srch: number,
        dstLayer: Layer,
        x: number,
        y: number,
      ): void;
      transfer(
        srcLayer: Layer,
        srcx: number,
        srcy: number,
        srcw: number,
        srch: number,
        dstLayer: Layer,
        x: number,
        y: number,
        transferFunction: (
          src: Uint8ClampedArray,
          dst: Uint8ClampedArray,
        ) => void,
      ): void;

      // Methods - Path operations
      moveTo(layer: Layer, x: number, y: number): void;
      lineTo(layer: Layer, x: number, y: number): void;
      arc(
        layer: Layer,
        x: number,
        y: number,
        radius: number,
        startAngle: number,
        endAngle: number,
        negative: boolean,
      ): void;
      curveTo(
        layer: Layer,
        cp1x: number,
        cp1y: number,
        cp2x: number,
        cp2y: number,
        x: number,
        y: number,
      ): void;
      close(layer: Layer): void;
      rect(layer: Layer, x: number, y: number, w: number, h: number): void;

      // Methods - Path styling
      clip(layer: Layer): void;
      strokeColor(
        layer: Layer,
        cap: string,
        join: string,
        thickness: number,
        r: number,
        g: number,
        b: number,
        a: number,
      ): void;
      fillColor(layer: Layer, r: number, g: number, b: number, a: number): void;
      strokeLayer(
        layer: Layer,
        cap: string,
        join: string,
        thickness: number,
        srcLayer: Layer,
      ): void;
      fillLayer(layer: Layer, srcLayer: Layer): void;

      // Methods - State management
      push(layer: Layer): void;
      pop(layer: Layer): void;
      reset(layer: Layer): void;

      // Methods - Transform operations
      setTransform(
        layer: Layer,
        a: number,
        b: number,
        c: number,
        d: number,
        e: number,
        f: number,
      ): void;
      transform(
        layer: Layer,
        a: number,
        b: number,
        c: number,
        d: number,
        e: number,
        f: number,
      ): void;

      // Methods - Layer properties
      setChannelMask(layer: Layer, mask: number): void;
      setMiterLimit(layer: Layer, limit: number): void;

      // Methods - Visible layer operations
      dispose(layer: Display.VisibleLayer): void;
      distort(
        layer: Display.VisibleLayer,
        a: number,
        b: number,
        c: number,
        d: number,
        e: number,
        f: number,
      ): void;
      move(
        layer: Display.VisibleLayer,
        parent: Display.VisibleLayer,
        x: number,
        y: number,
        z: number,
      ): void;
      shade(layer: Display.VisibleLayer, alpha: number): void;

      // Methods - Scale
      scale(scale: number): void;
      getScale(): number;

      // Methods - Utility
      flatten(): HTMLCanvasElement;
    }

    namespace Display {
      class VisibleLayer {
        // Properties and methods would be defined based on the VisibleLayer documentation
      }

      class Statistics {
        // Properties and methods would be defined based on the Statistics documentation
      }
    }

    class Layer {
      // Layer class definition
    }

    class InputStream {
      // InputStream class definition
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
      class State {
        constructor(template?: State);
        x: number;
        y: number;
        left: boolean;
        middle: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
        fromClientPosition(
          element: HTMLElement,
          clientX: number,
          clientY: number,
        ): void;
        static Buttons: {
          LEFT: string;
          MIDDLE: string;
          RIGHT: string;
          UP: string;
          DOWN: string;
        };
      }
    }

    class Keyboard {
      constructor(element: Element | Document);
      onkeydown: ((keysym: number) => void) | null;
      onkeyup: ((keysym: number) => void) | null;
    }

    class StringReader {
      constructor(stream: InputStream);
      ontext: ((text: string) => void) | null;
      onend: (() => void) | null;
    }

    class StringWriter {
      constructor(stream: OutputStream);
      sendText(text: string): void;
      sendEnd(): void;
    }

    class OutputStream {
      // OutputStream class definition
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
