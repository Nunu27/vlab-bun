import GuacamoleConnection from '@frontend/components/guacamole-connection';
import { LogIssuesButton, LogViewer } from '@frontend/components/log-viewer';
import { Button } from '@frontend/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import { useWSStore } from '@frontend/stores/ws';
import { Compile } from '@sinclair/typemap';
import { DeviceTestRequest } from '@vlab/shared/schemas';
import { Monitor } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { withForm, type DeviceFormData } from '../../hooks/use-device-form';
import { useTestDeviceStore } from '../../stores/test-device';

const validator = Compile(DeviceTestRequest);

const TestConnectionButton = withForm({
  defaultValues: {} as DeviceFormData,
  render: function Render({ form }) {
    const { send } = useWSStore.use.actions();

    const open = useTestDeviceStore.use.open();
    const token = useTestDeviceStore.use.token();
    const logs = useTestDeviceStore.use.logs();
    const { log, setOpen, setToken, setDispose } =
      useTestDeviceStore.use.actions();

    const scrollRef = useRef<HTMLDivElement>(null);

    type FieldKeys = keyof typeof form.state.fieldMeta;

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
                <GuacamoleConnection
                  token={token}
                  onError={(msg) => log('error', msg)}
                  onConnect={() =>
                    log('info', 'Desktop connection established')
                  }
                />
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
