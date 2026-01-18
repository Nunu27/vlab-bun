import { Button } from '@frontend/components/ui/button';
import { Link } from '@tanstack/react-router';
import { Play } from 'lucide-react';
import type { LabItem } from '../../student-columns';

export function ContinueSessionButton({ lab }: { lab: LabItem }) {
  if (!lab.sessionId) return null;

  return (
    <Button size="sm" className="w-full gap-2" asChild>
      <Link to="/lab/session/$sessionId" params={{ sessionId: lab.sessionId }}>
        <Play className="size-4" />
        Continue
      </Link>
    </Button>
  );
}
