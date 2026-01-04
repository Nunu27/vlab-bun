import Guacamole from 'guacamole-common-js';
import { useEffect, type RefObject } from 'react';

interface UseGuacamoleKeyboardProps {
  clientRef: RefObject<Guacamole.Client | null>;
  isConnected: boolean;
}

export const useGuacamoleKeyboard = ({
  clientRef,
  isConnected,
}: UseGuacamoleKeyboardProps) => {
  useEffect(() => {
    const keyboard = new Guacamole.Keyboard(document);

    keyboard.onkeydown = (keysym) => {
      if (isConnected && clientRef.current) {
        clientRef.current.sendKeyEvent(1, keysym);
      }
    };

    keyboard.onkeyup = (keysym) => {
      if (isConnected && clientRef.current) {
        clientRef.current.sendKeyEvent(0, keysym);
      }
    };

    return () => {
      keyboard.onkeydown = null;
      keyboard.onkeyup = null;
    };
  }, [clientRef, isConnected]);
};
