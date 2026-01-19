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
import { useNavigate } from '@tanstack/react-router';
import { Monitor } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDebounceCallback } from 'usehooks-ts';
import { useStudentLabActionStore } from '../../stores/student-lab-action-store';
import type { LabItem } from '../../types';

function StartLabSessionLogModal() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Logs<'info' | 'warn' | 'error'>>([]);

  const store = useStudentLabActionStore();
  const { open, data } = useActionState(store.use.start());
  const { setStart } = store.use.actions();

  const queryClient = useQueryClient();
  const { send } = useWSAction('lab/start');

  const onStarted = useDebounceCallback((sessionId: string) => {
    queryClient.invalidateQueries({ queryKey: ['lab', 'pagination'] });
    navigate({
      to: `/lab/session/$sessionId`,
      params: { sessionId },
    });
  }, 1000);

  const callbackRef = useRef((lab: LabItem | null) => {
    if (!lab) return setLogs([]);

    send(
      { labId: lab.id },
      {
        message: (message) =>
          setLogs((prev) => [...prev, { type: 'info', message }]),
        error: (message) =>
          setLogs((prev) => [...prev, { type: 'error', message }]),
        sessionId: (id) => {
          toast.success('Lab session started successfully!');
          onStarted(id);
        },
      },
    );
  });

  useEffect(() => {
    callbackRef.current(data);
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={() => setStart(null)}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 transition-all duration-300 sm:max-w-200">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-blue-500" />
            Starting Lab Session
          </DialogTitle>
        </DialogHeader>

        <LogViewer
          logs={logs}
          emptyMessage="Initializing session sequence..."
        />

        <DialogFooter className="bg-background p-4 sm:items-center sm:justify-between">
          <div className="flex h-9 flex-1 items-center">
            <LogIssuesButton logs={logs} />
          </div>

          <Button variant="outline" onClick={() => setStart(null)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StartLabSessionLogModal;
