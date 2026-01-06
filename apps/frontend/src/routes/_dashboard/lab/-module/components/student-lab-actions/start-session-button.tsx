import { LogIssuesButton, LogViewer } from '@frontend/components/log-viewer';
import { Button } from '@frontend/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import { useWSAction } from '@frontend/hooks/use-ws-action';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Monitor, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { LabItem } from '../../student-columns';

export function StartSessionButton({ lab }: { lab: LabItem }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { send } = useWSAction('lab/start');

  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<
    { type: 'info' | 'warn' | 'error'; message: string }[]
  >([]);

  const handleStartSession = () => {
    setOpen(true);
    setLogs([]);

    send(
      { labId: lab.id },
      {
        message: (msg) =>
          setLogs((prev) => [...prev, { type: 'info', message: msg }]),
        error: (err) =>
          setLogs((prev) => [...prev, { type: 'error', message: err }]),
        sessionId: (id) => {
          queryClient.invalidateQueries({ queryKey: ['lab', 'pagination'] });
          navigate({
            to: `/lab/session/$sessionId`,
            params: { sessionId: id },
          });
          toast.success('Lab session started successfully!');
        },
      },
    );
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

      <Dialog open={open} onOpenChange={setOpen}>
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

            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
