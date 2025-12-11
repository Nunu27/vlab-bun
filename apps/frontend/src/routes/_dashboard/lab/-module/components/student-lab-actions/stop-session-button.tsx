import { LogIssuesButton, LogViewer } from '@frontend/components/log-viewer';
import { Button } from '@frontend/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { Monitor, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { LabItem } from '../../student-columns';

export function StopSessionButton({ lab }: { lab: LabItem }) {
  const send = useRouteContext({
    from: '__root__',
    select: (ctx) => ctx.ws.send,
  });
  const queryClient = useQueryClient();

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

  if (!lab.sessionId) return null;

  const handleStopSession = () => {
    setOpen(true);
    setLogs([]);

    if (unsubscribeRef.current) unsubscribeRef.current();

    unsubscribeRef.current = send(
      'lab/stop',
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
          setTimeout(() => {
            setOpen(false);
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
        variant="destructive"
        className="w-full gap-2"
        onClick={handleStopSession}
      >
        <Square className="size-4 fill-current" />
        Stop
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 transition-all duration-300 sm:max-w-[800px]">
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

            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
