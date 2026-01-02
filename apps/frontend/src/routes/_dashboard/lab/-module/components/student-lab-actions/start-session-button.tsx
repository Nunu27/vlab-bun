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
import { useNavigate } from '@tanstack/react-router';
import { Monitor, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { LabItem } from '../../student-columns';

export function StartSessionButton({ lab }: { lab: LabItem }) {
  const navigate = useNavigate();
  const { send } = useWSStore.use.actions();

  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<
    { type: 'info' | 'warn' | 'error'; message: string }[]
  >([]);
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  const handleStartSession = () => {
    setOpen(true);
    setLogs([]);

    if (unsubscribeRef.current) unsubscribeRef.current();

    unsubscribeRef.current = send(
      'lab/start',
      { labId: lab.id },
      {
        message: (msg) =>
          setLogs((prev) => [...prev, { type: 'info', message: msg }]),
        error: (err) =>
          setLogs((prev) => [...prev, { type: 'error', message: err }]),
        sessionId: (id) => {
          setLogs((prev) => [
            ...prev,
            { type: 'info', message: 'Session started! Redirecting...' },
          ]);
          setTimeout(() => {
            navigate({
              to: `/lab/session/$sessionId`,
              params: { sessionId: id },
            });
          }, 1000);
        },
      },
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = undefined;
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2"
        onClick={handleStartSession}
      >
        <Plus className="size-4" />
        Start Lab
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
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

            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
