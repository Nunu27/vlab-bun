import GuacamoleConnection from '@frontend/components/guacamole-connection';
import { Badge } from '@frontend/components/ui/badge';
import { Button } from '@frontend/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@frontend/components/ui/popover';
import { Compile } from '@sinclair/typemap';
import { useRouteContext } from '@tanstack/react-router';
import { DeviceTestRequest } from '@vlab/shared/schemas';
import {
  AlertTriangle,
  Monitor,
  XCircle
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { create } from 'zustand';
import { withForm, type DeviceFormData } from '../../hooks/use-device-form';

interface TestDeviceState {
  open: boolean;
  token?: string;
  dispose?: () => void;
  logs: { type: 'info' | 'warn' | 'error'; message: string }[];
  issue: { type: 'warn' | 'error'; message: string }[];
  log: (type: 'info' | 'warn' | 'error', message: string) => void;
  setOpen: (open: boolean) => void;
  setToken: (token: string) => void;
  setDispose: (dispose?: () => void) => void;
  reset: () => void;
}

const initialState = {
  open: false,
  token: undefined,
  dispose: undefined,
  logs: [],
  issue: [],
};

const useTestDeviceStore = create<TestDeviceState>()((set) => ({
  ...initialState,
  log: (type, message) =>
    set((state) => ({
      logs: [...state.logs, { type, message }],
    })),
  setOpen: (open) => set({ ...(open ? {} : initialState), open }),
  setToken: (token) => set({ token }),
  setDispose: (dispose) => set({ dispose }),
  reset: () => set(({dispose}) => {
    dispose?.();

    return initialState;
  }),
}));

const validator = Compile(DeviceTestRequest);

const TestConnectionButton = withForm({
  defaultValues: {} as DeviceFormData,
  render: function Render({ form }) {
    const send = useRouteContext({
      from: '__root__',
      select: (ctx) => ctx.ws.send,
    });

    const { open, token, logs, log, setOpen, setToken, dispose, setDispose } =
      useTestDeviceStore();

    const scrollRef = useRef<HTMLDivElement>(null);

    type FieldKeys = keyof typeof form.state.fieldMeta;

    useEffect(() => {
      return () => {
        dispose?.();
      };
    }, [dispose]);

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [logs]);

    const handleTestDevice = async () => {
      const value = form.state.values;

      if (!validator.Check(value)) {
        toast.error('Validation failed', {
          description: 'Please check all required fields',
        });

        const errors = validator.Errors(value);

        for (const error of errors) {
          const key = error.path.substring(1).replace(/\//g, '.') as FieldKeys;

          form.setFieldMeta(key, (meta) => ({
            ...meta,
            isTouched: true,
            errorMap: { onSubmit: true },
          }));
        }

        return;
      }

      setOpen(true);

      const unsub = send('device/test', validator.Parse(value), {
        message: (message) => log('info', message),
        warn: (message) => log('warn', message),
        token: (token) => setToken(token),
        error: (message) => log('error', message),
        done: () => console.log('Done'),
      });

      setDispose(unsub);
    };

    const hasErrors = logs.some((l) => l.type === 'error');
    const issues = logs.filter((l) => l.type === 'warn' || l.type === 'error');
    const issueButtonColor = hasErrors
      ? 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-900/20'
      : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:text-yellow-500 dark:hover:bg-yellow-900/20';

    const issueBadgeColor = hasErrors
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';

    return (
      <>
        <Button onClick={handleTestDevice} type="button">
          Test Connection
        </Button>

        <Dialog
          open={open}
          onOpenChange={(newOpen) => {
            if (!newOpen && dispose) {
              setDispose(undefined);
            }
            setOpen(newOpen);
          }}
        >
          <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 transition-all duration-300 sm:max-w-[800px]">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-blue-500" />
                Remote Desktop Session
              </DialogTitle>
            </DialogHeader>

            <div className="relative flex aspect-video w-full flex-col overflow-hidden bg-slate-950">
              {!token ? (
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                  <div className="space-y-1.5">
                    {logs.map((log, index) => {
                      const isLast = index === logs.length - 1;
                      return (
                        <div
                          key={index}
                          ref={isLast ? scrollRef : null}
                          className="flex items-start gap-3"
                        >
                          <span className="shrink-0 select-none text-slate-600">
                            [{new Date().toLocaleTimeString()}]
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`
                                ${log.type === 'warn' ? 'text-yellow-400' : ''}
                                ${
                                  log.type === 'error'
                                    ? 'font-semibold text-red-500'
                                    : ''
                                } 
                                ${log.type === 'info' ? 'text-slate-300' : ''}
                              `}
                            >
                              {log.message}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {logs.length === 0 && (
                      <div className="text-slate-500">
                        Initializing connection sequence...
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <GuacamoleConnection
                  token={token}
                  onError={(msg) => log('error', msg)}
                  onConnect={() => log('info', 'Desktop connection established')}
                />
              )}
            </div>

            <DialogFooter className="bg-background p-4 sm:justify-between sm:items-center">
              <div className="flex h-9 flex-1 items-center">
                {issues.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={issueButtonColor}
                      >
                        {hasErrors ? (
                          <XCircle className="mr-2 h-4 w-4" />
                        ) : (
                          <AlertTriangle className="mr-2 h-4 w-4" />
                        )}
                        Issues
                        <Badge
                          variant="secondary"
                          className={`ml-2 ${issueBadgeColor}`}
                        >
                          {issues.length}
                        </Badge>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-0" align="start">
                      <div className="rounded-md border border-slate-800 bg-slate-950 p-2 font-mono text-xs text-slate-300">
                        <div className="flex justify-between border-b border-slate-800 px-2 py-1.5 font-semibold text-slate-500">
                          <span>System Log Issues</span>
                          {hasErrors && (
                            <span className="text-[10px] uppercase tracking-wider text-red-400">
                              Critical Errors Found
                            </span>
                          )}
                        </div>
                        <div className="h-[150px] overflow-y-auto">
                          {issues.map((issue, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 border-b border-slate-900 px-2 py-2 hover:bg-slate-900/50"
                            >
                              <span className="mt-0.5 shrink-0">
                                {issue.type === 'error' ? (
                                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                                ) : issue.type === 'warn' ? (
                                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                                ) : (
                                  <div className="h-3.5 w-3.5" />
                                )}
                              </span>
                              <div>
                                <p
                                  className={`
                                    ${
                                      issue.type === 'error'
                                        ? 'text-red-300'
                                        : issue.type === 'warn'
                                          ? 'text-yellow-200/90'
                                          : 'text-slate-300'
                                    }
                                `}
                                >
                                  {issue.message}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <Button
                variant={token ? 'secondary' : 'outline'}
                onClick={() => setOpen(false)}
              >
                {token ? 'Close Session' : 'Cancel'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
});

export default TestConnectionButton;
