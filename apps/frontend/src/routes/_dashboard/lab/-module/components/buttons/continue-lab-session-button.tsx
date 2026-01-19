import { Button } from '@frontend/components/ui/button';
import { Link } from '@tanstack/react-router';
import { PlayIcon } from 'lucide-react';

function ContinueLabSessionButton({ sessionId }: { sessionId: string }) {
  return (
    <Button asChild>
      <Link to="/lab/session/$sessionId" params={{ sessionId }}>
        <PlayIcon className="size-4" />
        Continue
      </Link>
    </Button>
  );
}

export default ContinueLabSessionButton;
