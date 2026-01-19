import { LogIssuesButton, LogViewer } from '@frontend/components/log-viewer';
import { Button } from '@frontend/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import { useActionState } from '@frontend/hooks/use-action-state';
import { useWSAction } from '@frontend/hooks/use-ws-action';
import type { Logs } from '@frontend/types/store';
import { useQueryClient } from '@tanstack/react-query';
import { Monitor } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useStudentLabActionStore } from '../../stores/student-lab-action-store';
import type { LabItem } from '../../types';

function StopLabSessionLogModal() {
  const [logs, setLogs] = useState<Logs<'info' | 'warn' | 'error'>>([]);

  const store = useStudentLabActionStore();
  const { open, data } = useActionState(store.use.stop());
  const { setStop } = store.use.actions();

  const queryClient = useQueryClient();
  const { send } = useWSAction('lab/stop');

  const callbackRef = useRef((lab: LabItem | null) => {
    if (!lab) return setLogs([]);

    send(
      { sessionId: lab.sessionId! },
      {
        message: (msg) =>
          setLogs((prev) => [...prev, { type: 'info', message: msg }]),
        error: (err) =>
          setLogs((prev) => [...prev, { type: 'error', message: err }]),
        done: () => {
          setLogs((prev) => [
            ...prev,
            { type: 'info', message: 'Session stopped successfully' },
          ]);
          queryClient.invalidateQueries({ queryKey: ['lab', 'pagination'] });
          toast.success('Lab session stopped successfully!');
          setStop(null);
        },
      },
    );
  });

  useEffect(() => {
    callbackRef.current(data);
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={() => setStop(null)}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 transition-all duration-300 sm:max-w-200">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-blue-500" />
            Stopping Lab Session
          </DialogTitle>
        </DialogHeader>

        <LogViewer logs={logs} emptyMessage="Initializing stop sequence..." />

        <DialogFooter className="bg-background p-4 sm:items-center sm:justify-between">
          <div className="flex h-9 flex-1 items-center">
            <LogIssuesButton logs={logs} />
          </div>

          <Button variant="outline" onClick={() => setStop(null)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StopLabSessionLogModal;
