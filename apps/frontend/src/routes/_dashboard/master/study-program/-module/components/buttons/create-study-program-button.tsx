import { Button } from '@frontend/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useStudyProgramActionStore } from '../../stores/study-program-action-store';

function CreateStudyProgramButton() {
  const { setCreate } = useStudyProgramActionStore().use.actions();

  return (
    <Button size="lg" onClick={() => setCreate()}>
      <PlusIcon /> Create Study Program
    </Button>
  );
}

export default CreateStudyProgramButton;
