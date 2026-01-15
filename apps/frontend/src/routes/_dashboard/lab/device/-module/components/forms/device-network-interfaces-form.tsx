import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ActionButton } from '@frontend/components/action-button';
import { Button } from '@frontend/components/ui/button';
import { Checkbox } from '@frontend/components/ui/checkbox';
import { Input } from '@frontend/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@frontend/components/ui/table';
import { cn } from '@frontend/lib/utils';
import { GripVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { withFieldGroup } from '@frontend/hooks/use-app-form';
import { useStore } from '@tanstack/react-form';

interface SortableInterfaceRowProps {
  id: string;
  displayCode: string;
  internalCode: string;
  configurable: boolean;
  onDisplayCodeChange: (value: string) => void;
  onInternalCodeChange: (value: string) => void;
  onConfigurableChange: (value: boolean) => void;
  onDelete: () => void;
}

function SortableInterfaceRow({
  id,
  displayCode,
  internalCode,
  configurable,
  onDisplayCodeChange,
  onInternalCodeChange,
  onConfigurableChange,
  onDelete,
}: SortableInterfaceRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-50')}
    >
      <TableCell className="w-12 text-center">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-5" />
        </button>
      </TableCell>
      <TableCell>
        <Input
          placeholder="Display Code"
          value={displayCode}
          onChange={(e) => onDisplayCodeChange(e.target.value)}
          className="h-9"
        />
      </TableCell>
      <TableCell>
        <Input
          placeholder="Internal Code"
          value={internalCode}
          onChange={(e) => onInternalCodeChange(e.target.value)}
          className="h-9"
        />
      </TableCell>
      <TableCell className="w-24 text-center">
        <Checkbox
          checked={configurable}
          onCheckedChange={onConfigurableChange}
        />
      </TableCell>
      <TableCell className="w-16 text-center">
        <ActionButton
          icon={Trash2Icon}
          tooltip="Delete"
          type="button"
          variant="destructive"
          onClick={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}

export const DeviceNetworkInterfacesForm = withFieldGroup({
  defaultValues: [] as {
    displayCode: string;
    internalCode: string;
    configurable: boolean;
  }[],
  render: function Render({ group }) {
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    );

    const values = useStore(group.store, (state) => state.values);

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = values.findIndex(
          (_, i) => `interface-${i}` === active.id,
        );
        const newIndex = values.findIndex(
          (_, i) => `interface-${i}` === over.id,
        );

        const reordered = arrayMove(values, oldIndex, newIndex);
        group.form.setFieldValue('interfaces', reordered);
      }
    };

    return (
      <div className="space-y-4">
        {values.length > 0 ? (
          <div className="overflow-hidden rounded-lg border">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Display Code</TableHead>
                    <TableHead>Internal Code</TableHead>
                    <TableHead className="w-24 text-center">
                      Configurable
                    </TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={values.map((_, i) => `interface-${i}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {values.map((iface, index) => (
                      <SortableInterfaceRow
                        key={`interface-${index}`}
                        id={`interface-${index}`}
                        displayCode={iface.displayCode}
                        internalCode={iface.internalCode}
                        configurable={iface.configurable}
                        onDisplayCodeChange={(value) => {
                          const updated = [...values];
                          updated[index] = {
                            ...updated[index],
                            displayCode: value,
                          };
                          group.form.setFieldValue('interfaces', updated);
                        }}
                        onInternalCodeChange={(value) => {
                          const updated = [...values];
                          updated[index] = {
                            ...updated[index],
                            internalCode: value,
                          };
                          group.form.setFieldValue('interfaces', updated);
                        }}
                        onConfigurableChange={(value) => {
                          const updated = [...values];
                          updated[index] = {
                            ...updated[index],
                            configurable: value,
                          };
                          group.form.setFieldValue('interfaces', updated);
                        }}
                        onDelete={() => {
                          group.form.setFieldValue(
                            'interfaces',
                            values.filter((_, i) => i !== index),
                          );
                        }}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>
        ) : (
          <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center">
            No interfaces defined. Click the button below to add one.
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            group.form.setFieldValue('interfaces', [
              ...values,
              { displayCode: '', internalCode: '', configurable: true },
            ]);
          }}
        >
          <PlusIcon /> Add Interface
        </Button>
      </div>
    );
  },
});
