import { Button } from '@frontend/components/ui/button';
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

interface SortableInterfaceRowProps {
  id: string;
  code: string;
  name: string;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onDelete: () => void;
}

function SortableInterfaceRow({
  id,
  code,
  name,
  onCodeChange,
  onNameChange,
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
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-5" />
        </button>
      </TableCell>
      <TableCell>
        <Input
          placeholder="e.g., eth0"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          className="h-9"
        />
      </TableCell>
      <TableCell>
        <Input
          placeholder="e.g., Management"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="h-9"
        />
      </TableCell>
      <TableCell className="w-16 text-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface DeviceNetworkInterfacesFormProps {
  form: any;
}

export function DeviceNetworkInterfacesForm({
  form,
}: DeviceNetworkInterfacesFormProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <form.Field name="interfaces">
      {(field: any) => {
        const handleDragEnd = (event: DragEndEvent) => {
          const { active, over } = event;

          if (over && active.id !== over.id) {
            const oldIndex = field.state.value.findIndex(
              (_: any, i: number) => `interface-${i}` === active.id,
            );
            const newIndex = field.state.value.findIndex(
              (_: any, i: number) => `interface-${i}` === over.id,
            );

            const reordered = arrayMove(field.state.value, oldIndex, newIndex);
            field.handleChange(reordered);
          }
        };

        return (
          <div className="space-y-4">
            {field.state.value.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
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
                        <TableHead>Interface Code</TableHead>
                        <TableHead>Interface Name</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={field.state.value.map(
                          (_: any, i: number) => `interface-${i}`,
                        )}
                        strategy={verticalListSortingStrategy}
                      >
                        {field.state.value.map((iface: any, index: number) => (
                          <SortableInterfaceRow
                            key={`interface-${index}`}
                            id={`interface-${index}`}
                            code={iface.code}
                            name={iface.name}
                            onCodeChange={(value) => {
                              const updated = [...field.state.value];
                              updated[index].code = value;
                              field.handleChange(updated);
                            }}
                            onNameChange={(value) => {
                              const updated = [...field.state.value];
                              updated[index].name = value;
                              field.handleChange(updated);
                            }}
                            onDelete={() => {
                              field.handleChange(
                                field.state.value.filter(
                                  (_: any, i: number) => i !== index,
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
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                No interfaces defined. Click the button below to add one.
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                field.handleChange([
                  ...field.state.value,
                  { code: '', name: '' },
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
}
