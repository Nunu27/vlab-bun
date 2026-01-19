import { Button } from '@frontend/components/ui/button';
import { SquareIcon } from 'lucide-react';
import { useStudentLabActionStore } from '../../stores/student-lab-action-store';
import type { LabItem } from '../../types';

function StopLabSessionButton({ lab }: { lab: LabItem }) {
  const { setStop } = useStudentLabActionStore().use.actions();

  return (
    <Button variant="destructive" onClick={() => setStop(lab)}>
      <SquareIcon />
      Stop
    </Button>
  );
}

export default StopLabSessionButton;
