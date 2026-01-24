import { Spinner } from '@frontend/components/ui/spinner';
import { AlertCircle } from 'lucide-react';
import React from 'react';
import type { ConnectionState } from '../stores/guacamole-connection-store';

interface ConnectionStatesProps {
  state: ConnectionState | 'waiting';
  errorMessage?: string | null;
  title?: string;
  description?: string;
  spinnerColor?: 'blue' | 'amber';
}

type StateKey = Exclude<ConnectionState, 'connected'> | 'waiting';

interface StateConfig {
  defaultTitle: string;
  defaultDescription: string | null;
  showSpinner?: boolean;
  showIcon?: boolean;
}

const STATE_CONFIG: Record<StateKey, StateConfig> = {
  connecting: {
    defaultTitle: 'Connecting to Device',
    defaultDescription: 'Establishing secure tunnel...',
    showSpinner: true,
  },
  waiting: {
    defaultTitle: 'Waiting',
    defaultDescription: 'Please wait...',
    showSpinner: true,
  },
  disconnected: {
    defaultTitle: 'Session Ended',
    defaultDescription: null,
  },
  error: {
    defaultTitle: 'Connection Failed',
    defaultDescription: null,
    showIcon: true,
  },
} as const;

export const GuacamoleConnectionStates: React.FC<ConnectionStatesProps> = ({
  state,
  errorMessage,
  title,
  description,
  spinnerColor = 'blue',
}) => {
  if (state === 'connected') return null;

  const config = STATE_CONFIG[state];
  const displayTitle = title ?? config.defaultTitle;
  const displayDescription =
    description ??
    (state === 'error' ? errorMessage : config.defaultDescription);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-gray-900 text-white">
      {config.showSpinner && (
        <div className="relative">
          <div
            className={`absolute inset-0 rounded-full opacity-20 blur-xl ${
              spinnerColor === 'amber' ? 'bg-amber-500' : 'bg-blue-500'
            }`}
          />
          <Spinner className="size-12" />
        </div>
      )}

      {config.showIcon && (
        <div className="rounded-full bg-red-500/10 p-4">
          <AlertCircle className="size-12 text-red-500" />
        </div>
      )}

      <div className="space-y-1 px-8 text-center">
        <p
          className={`font-medium ${
            state === 'error'
              ? 'text-red-400'
              : state === 'disconnected'
                ? 'text-slate-400'
                : 'text-slate-200'
          }`}
        >
          {displayTitle}
        </p>
        {displayDescription && (
          <p
            className={`text-sm ${
              state === 'connecting' || state === 'waiting'
                ? 'font-mono text-xs text-slate-500'
                : 'text-slate-400'
            }`}
          >
            {displayDescription}
          </p>
        )}
      </div>
    </div>
  );
};
