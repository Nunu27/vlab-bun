import { LogIssuesButton, LogViewer } from '@frontend/components/log-viewer';
import { Button } from '@frontend/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import { withFieldGroup } from '@frontend/hooks/use-app-form';
import { useWSAction } from '@frontend/hooks/use-ws-action';
import GuacamoleConnection from '@frontend/shared/guacamole/components/guacamole-connection';
import { GuacamoleConnectionProvider } from '@frontend/shared/guacamole/stores/guacamole-connection-store';
import { Compile } from '@sinclair/typemap';
import { DeviceTestRequest } from '@vlab/shared/schemas/ws';
import { Monitor } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTestDeviceStore } from '../../stores/test-device-store';

const validator = Compile(DeviceTestRequest);
type FieldKeys = keyof typeof DeviceTestRequest.static;

const TestConnectionButton = withFieldGroup({
  defaultValues: {} as typeof DeviceTestRequest.static,
  render: function Render({ group }) {
    const { send, dispose } = useWSAction('device/test');

    const store = useTestDeviceStore();

    const open = store.use.open();
    const token = store.use.token();
    const logs = store.use.logs();
    const { log, setOpen, setToken, setDispose } = store.use.actions();

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setDispose(dispose);
    }, [dispose, setDispose]);

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [logs]);

    const handleTestDevice = async () => {
      const value = group.state.values;

      if (!validator.Check(value)) {
        toast.error('Validation failed', {
          description: 'Please check all required fields',
        });

        const errors = validator.Errors(value);

        for (const error of errors) {
          const key = error.path.substring(1).replace(/\//g, '.') as FieldKeys;

          group.setFieldMeta(key, (meta) => ({
            ...meta,
            errorMap: { onSubmit: [error] },
          }));
        }

        return;
      }

      setOpen(true);

      send(validator.Parse(value), {
        message: (message) => log('info', message),
        warn: (message) => log('warn', message),
        token: (token) => setToken(token),
        error: (message) => log('error', message),
        done: () => console.log('Done'),
      });
    };

    return (
      <>
        <Button onClick={handleTestDevice} type="button">
          Test Connection
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 transition-all duration-300 sm:max-w-200">
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
                <GuacamoleConnectionProvider>
                  <GuacamoleConnection
                    token={token}
                    onError={(msg) => log('error', msg)}
                    onConnect={() =>
                      log('info', 'Desktop connection established')
                    }
                  />
                </GuacamoleConnectionProvider>
              </div>
            )}

            <DialogFooter className="bg-background p-4 sm:items-center sm:justify-between">
              <div className="flex h-9 flex-1 items-center">
                <LogIssuesButton logs={logs} />
              </div>

              <Button variant="secondary" onClick={() => setOpen(false)}>
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
