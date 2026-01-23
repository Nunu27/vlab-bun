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
import type { DeviceInterface } from '@vlab/shared/schemas/rest';
import { GripVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react';

type InterfaceEntry = DeviceInterface & {
  id?: string;
};

const SortableInterfaceRow = withFieldGroup({
  defaultValues: {} as InterfaceEntry,
  props: {
    index: 0,
    onDelete: () => {},
  },
  render: function Render({ group, index, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useSortable({ id: index });

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
          <group.Field name="name">
            {({ state, handleChange, handleBlur }) => {
              const isInvalid = state.meta.isTouched && !state.meta.isValid;

              return (
                <Input
                  placeholder="Name"
                  value={state.value}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  className="h-9"
                  aria-invalid={isInvalid}
                />
              );
            }}
          </group.Field>
        </TableCell>
        <TableCell className="w-24 text-center">
          <group.Field name="configurable">
            {({ state, handleChange, handleBlur }) => (
              <Checkbox
                checked={state.value}
                onCheckedChange={(e) => handleChange(e === true)}
                onBlur={handleBlur}
              />
            )}
          </group.Field>
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
  },
});

export const DeviceNetworkInterfacesForm = withFieldGroup({
  defaultValues: {
    interfaces: [] as InterfaceEntry[],
  },
  render: function Render({ group }) {
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    );

    const haveItem = useStore(
      group.store,
      (state) => !!state.values.interfaces.length,
    );

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        group.moveFieldValues('interfaces', Number(active.id), Number(over.id));
      }
    };

    return (
      <div className="space-y-4">
        {haveItem ? (
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
                    <TableHead>Name</TableHead>
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
                        items={field.state.value.map((_, i) => i)}
                        strategy={verticalListSortingStrategy}
                      >
                        {field.state.value.map((iface, index) => {
                          if (!iface.id) {
                            field.replaceValue(index, {
                              ...iface,
                              id: crypto.randomUUID(),
                            });
                          }

                          return (
                            <SortableInterfaceRow
                              key={iface.id || crypto.randomUUID()}
                              index={index}
                              form={group}
                              fields={{
                                id: `interfaces[${index}].id`,
                                name: `interfaces[${index}].name`,
                                configurable: `interfaces[${index}].configurable`,
                              }}
                              onDelete={() => {
                                field.removeValue(index);
                              }}
                            />
                          );
                        })}
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
              name: '',
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
