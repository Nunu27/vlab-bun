import { Button } from '@frontend/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useLecturerActionStore } from '../../stores/lecturer-action-store';

function CreateLecturerButton() {
  const { setCreate } = useLecturerActionStore().use.actions();

  return (
    <Button size="lg" onClick={() => setCreate()}>
      <PlusIcon /> Add Lecturer
    </Button>
  );
}

export default CreateLecturerButton;
