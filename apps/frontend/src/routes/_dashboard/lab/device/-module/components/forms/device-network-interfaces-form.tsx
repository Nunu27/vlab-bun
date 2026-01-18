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
import { withFieldGroup } from '@frontend/hooks/use-app-form';
import { cn } from '@frontend/lib/utils';
import { useStore } from '@tanstack/react-form';
import { GripVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react';

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
  defaultValues: {
    interfaces: [] as {
      id?: string;
      displayCode: string;
      internalCode: string;
      configurable: boolean;
    }[],
  },
  render: function Render({ group }) {
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    );

    const length = useStore(
      group.store,
      (state) => state.values.interfaces.length,
    );

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        group.moveFieldValues('interfaces', Number(active.id), Number(over.id));
      }
    };

    return (
      <div className="space-y-4">
        {length > 0 ? (
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
                  <group.Field name="interfaces" mode="array">
                    {(field) => (
                      <SortableContext
                        items={field.state.value.map((_, i) => `${i}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {field.state.value.map(({ id }, index) => (
                          <group.Field
                            name={`interfaces[${index}]`}
                            key={id || `temp-${index}`}
                          >
                            {(subField) => {
                              const iface = subField.state.value;
                              if (!iface.id) {
                                subField.setValue({
                                  ...iface,
                                  id: crypto.randomUUID(),
                                });
                              }

                              return (
                                <SortableInterfaceRow
                                  id={`${index}`}
                                  displayCode={iface.displayCode}
                                  internalCode={iface.internalCode}
                                  configurable={iface.configurable}
                                  onDisplayCodeChange={(value) => {
                                    subField.setValue({
                                      ...iface,
                                      displayCode: value,
                                    });
                                  }}
                                  onInternalCodeChange={(value) => {
                                    subField.setValue({
                                      ...iface,
                                      internalCode: value,
                                    });
                                  }}
                                  onConfigurableChange={(value) => {
                                    subField.setValue({
                                      ...iface,
                                      configurable: value,
                                    });
                                  }}
                                  onDelete={() => {
                                    field.removeValue(index);
                                  }}
                                />
                              );
                            }}
                          </group.Field>
                        ))}
                      </SortableContext>
                    )}
                  </group.Field>
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
            group.pushFieldValue('interfaces', {
              id: crypto.randomUUID(),
              displayCode: '',
              internalCode: '',
              configurable: true,
            });
          }}
        >
          <PlusIcon /> Add Interface
        </Button>
      </div>
    );
  },
});
