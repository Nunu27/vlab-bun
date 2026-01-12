import { Button } from '@frontend/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useStudentActionStore } from '../../stores/student-action-store';

function CreateStudentButton() {
  const { setCreate } = useStudentActionStore().use.actions();

  return (
    <Button size="lg" onClick={() => setCreate()}>
      <PlusIcon /> Add Student
    </Button>
  );
}

export default CreateStudentButton;
