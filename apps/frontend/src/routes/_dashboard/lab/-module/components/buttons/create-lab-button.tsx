import { Button } from '@frontend/components/ui/button';
import { Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

function CreateLabButton() {
  return (
    <Button asChild>
      <Link to="/lab/create">
        <PlusIcon className="mr-2 size-4" />
        Create Lab
      </Link>
    </Button>
  );
}

export default CreateLabButton;
