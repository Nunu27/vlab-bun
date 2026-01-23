import { Button } from '@frontend/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useDeviceCategoryActionStore } from '../../stores/device-category-action-store';

function CreateDeviceCategoryButton() {
  const { setCreate } = useDeviceCategoryActionStore().use.actions();

  return (
    <Button size="lg" onClick={() => setCreate()}>
      <PlusIcon /> Add Device Category
    </Button>
  );
}

export default CreateDeviceCategoryButton;
