import { Button } from '@frontend/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useStudentLabActionStore } from '../../stores/student-lab-action-store';
import type { LabItem } from '../../types';

function StartLabSessionButton({ lab }: { lab: LabItem }) {
  const { setStart } = useStudentLabActionStore().use.actions();

  return (
    <Button className="w-full" variant="outline" onClick={() => setStart(lab)}>
      <PlusIcon />
      Start Lab
    </Button>
  );
}

export default StartLabSessionButton;
