import { LogIssuesButton, LogViewer } from '@frontend/components/log-viewer';
import { Button } from '@frontend/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import { Compile } from '@sinclair/typemap';
import { useRouteContext } from '@tanstack/react-router';
import { DeviceTestRequest } from '@vlab/shared/schemas';
import { Monitor } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { create } from 'zustand';
import { withForm, type DeviceFormData } from '../../hooks/use-device-form';

const GuacamoleConnection = lazy(
  () => import('@frontend/components/guacamole-connection'),
);

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
  reset: () =>
    set(({ dispose }) => {
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

            {!token ? (
              <LogViewer
                logs={logs}
                emptyMessage="Initializing connection sequence..."
              />
            ) : (
              <div className="relative flex aspect-video w-full flex-col overflow-hidden bg-slate-950">
                <Suspense
                  fallback={
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      Loading viewer...
                    </div>
                  }
                >
                  <GuacamoleConnection
                    token={token}
                    onError={(msg) => log('error', msg)}
                    onConnect={() =>
                      log('info', 'Desktop connection established')
                    }
                  />
                </Suspense>
              </div>
            )}

            <DialogFooter className="bg-background p-4 sm:items-center sm:justify-between">
              <div className="flex h-9 flex-1 items-center">
                <LogIssuesButton logs={logs} />
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
