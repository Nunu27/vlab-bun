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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { GripVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { withForm, type DeviceFormData } from '../hooks/use-device-form';

interface SortableInterfaceRowProps {
  id: string;
  name: string;
  configurable: boolean;
  onNameChange: (value: string) => void;
  onConfigurableChange: (value: boolean) => void;
  onDelete: () => void;
}

function SortableInterfaceRow({
  id,
  name,
  configurable,
  onNameChange,
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
          placeholder="e.g., eth1"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
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
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={onDelete}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export const DeviceNetworkInterfacesForm = withForm({
  defaultValues: {} as DeviceFormData,
  render: function Render({ form }) {
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    );

    return (
      <form.Field name="interfaces">
        {(field) => {
          const handleDragEnd = (event: DragEndEvent) => {
            const { active, over } = event;

            if (over && active.id !== over.id) {
              const oldIndex = field.state.value.findIndex(
                (_, i) => `interface-${i}` === active.id,
              );
              const newIndex = field.state.value.findIndex(
                (_, i) => `interface-${i}` === over.id,
              );

              const reordered = arrayMove(
                field.state.value,
                oldIndex,
                newIndex,
              );
              field.handleChange(reordered);
            }
          };

          return (
            <div className="space-y-4">
              {field.state.value.length > 0 ? (
                <div className="overflow-hidden rounded-lg border">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[
                      restrictToVerticalAxis,
                      restrictToParentElement,
                    ]}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Interface Name</TableHead>
                          <TableHead className="w-24 text-center">
                            Configurable
                          </TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SortableContext
                          items={field.state.value.map(
                            (_, i) => `interface-${i}`,
                          )}
                          strategy={verticalListSortingStrategy}
                        >
                          {field.state.value.map((iface, index) => (
                            <SortableInterfaceRow
                              key={`interface-${index}`}
                              id={`interface-${index}`}
                              name={iface.name}
                              configurable={iface.configurable}
                              onNameChange={(value) => {
                                const updated = [...field.state.value];
                                updated[index] = {
                                  ...updated[index],
                                  name: value,
                                };
                                field.handleChange(updated);
                              }}
                              onConfigurableChange={(value) => {
                                const updated = [...field.state.value];
                                updated[index] = {
                                  ...updated[index],
                                  configurable: value,
                                };
                                field.handleChange(updated);
                              }}
                              onDelete={() => {
                                field.handleChange(
                                  field.state.value.filter(
                                    (_, i) => i !== index,
                                  ),
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
                  field.handleChange([
                    ...field.state.value,
                    { name: '', configurable: true },
                  ]);
                }}
              >
                <PlusIcon /> Add Interface
              </Button>
            </div>
          );
        }}
      </form.Field>
    );
  },
});
