import { Button } from '@frontend/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useDepartmentActionStore } from '../../stores/department-action-store';

function CreateDepartmentButton() {
  const { setCreate } = useDepartmentActionStore().use.actions();

  return (
    <Button size="lg" onClick={() => setCreate()}>
      <PlusIcon /> Add Department
    </Button>
  );
}

export default CreateDepartmentButton;
