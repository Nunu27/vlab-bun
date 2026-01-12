import { AlertCircle, Loader2 } from 'lucide-react';
import React from 'react';
import type { ConnectionState } from '../stores/guacamole-connection-store';

interface ConnectionStatesProps {
  state: ConnectionState;
  errorMessage: string | null;
}

export const GuacamoleConnectionStates: React.FC<ConnectionStatesProps> = ({
  state,
  errorMessage,
}) => {
  if (state === 'connecting') {
    return (
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
    );
  }

  if (state === 'disconnected') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-gray-900 text-white">
        <div className="space-y-1 px-8 text-center">
          <p className="font-medium text-slate-400">Session Ended</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-gray-900 text-white">
        <div className="rounded-full bg-red-500/10 p-4">
          <AlertCircle className="size-12 text-red-500" />
        </div>
        <div className="space-y-1 px-8 text-center">
          <p className="font-medium text-red-400">Connection Failed</p>
          <p className="text-sm text-slate-400">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return null;
};
