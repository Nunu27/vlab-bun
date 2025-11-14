import { Button } from '@frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@frontend/components/ui/dropdown-menu';
import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/lib/api-types';
import { MoreVerticalIcon } from 'lucide-react';
import { useState } from 'react';
import { DeleteStudyProgramModal } from './modals/delete-study-program-modal';
import { EditStudyProgramModal } from './modals/edit-study-program-modal';

type Item = ExtractPaginationData<(typeof api)['study-program']['pagination']>;

export function StudyProgramActionsCell({
  studyProgram,
}: {
  studyProgram: Item;
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <div className="flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <MoreVerticalIcon />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onSelect={() => setEditDialogOpen(true)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setDeleteDialogOpen(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditStudyProgramModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        studyProgramId={studyProgram.id}
        studyProgramName={studyProgram.name}
        studyProgramDepartmentId={studyProgram.department?.id ?? ''}
      />
      <DeleteStudyProgramModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        studyProgramId={studyProgram.id}
        studyProgramName={studyProgram.name}
      />
    </>
  );
}
