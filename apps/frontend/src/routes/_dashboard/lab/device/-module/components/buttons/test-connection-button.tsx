import GuacamoleConnection from '@frontend/components/guacamole-connection';
import { Button } from '@frontend/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import { Compile } from '@sinclair/typemap';
import { useRouteContext } from '@tanstack/react-router';
import { DeviceTestRequest } from '@vlab/shared/schemas';
import { useEffect } from 'react';
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
  reset: () => set(initialState),
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

    type FieldKeys = keyof typeof form.state.fieldMeta;

    useEffect(() => {
      return () => {
        dispose?.();
      };
    }, [dispose]);

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
        message: (message) => {
          log('info', message);
        },
        warn: (message) => {
          log('warn', message);
        },
        token: (token) => {
          setToken(token);
        },
        error: (message) => {
          log('error', message);
        },
        done: () => {
          console.log('Done');
        },
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
          <DialogContent className="flex h-[80vh] max-w-4xl flex-col">
            <DialogHeader>
              <DialogTitle>Connection Test</DialogTitle>
            </DialogHeader>

            <div className="flex flex-1 flex-col gap-4 overflow-hidden">
              {/* Logs Area */}
              <div className="bg-muted max-h-[200px] overflow-y-auto rounded-md p-4 font-mono text-sm">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.type === 'error'
                        ? 'text-red-500'
                        : log.type === 'warn'
                          ? 'text-yellow-500'
                          : 'text-foreground'
                    }
                  >
                    [{log.type.toUpperCase()}] {log.message}
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-muted-foreground">
                    Waiting for logs...
                  </div>
                )}
              </div>

              {/* Guacamole Area */}
              {token && (
                <div className="relative flex-1 overflow-hidden rounded-md border bg-black">
                  <GuacamoleConnection token={token} />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  },
});

export default TestConnectionButton;
