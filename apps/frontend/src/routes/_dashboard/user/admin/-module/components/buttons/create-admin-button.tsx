import { Button } from '@frontend/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useAdminActionStore } from '../../stores/admin-action-store';

function CreateAdminButton() {
  const { setCreate } = useAdminActionStore().use.actions();

  return (
    <Button size="lg" onClick={() => setCreate()}>
      <PlusIcon /> Add Admin
    </Button>
  );
}

export default CreateAdminButton;
