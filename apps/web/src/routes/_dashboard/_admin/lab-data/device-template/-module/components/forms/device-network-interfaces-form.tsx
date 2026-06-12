import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	restrictToParentElement,
	restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStore } from "@tanstack/react-form";
import type { DeviceTemplateInterface } from "@vlab/shared/schemas/device-template";
import { ActionButton } from "@web/components/buttons/action-button";
import { Button } from "@web/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@web/components/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web/components/ui/table";
import { withFieldGroup } from "@web/hooks/form/use-app-form";
import { cn } from "@web/lib/utils";
import {
	GripVerticalIcon,
	NetworkIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";

type InterfaceEntry = DeviceTemplateInterface & {
	id?: string;
};

function SortableInterfaceRow({
	group,
	id,
	index,
	onDelete,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: generic form group
	group: any;
	id: string;
	index: number;
	onDelete: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<TableRow
			ref={setNodeRef}
			style={style}
			className={cn(isDragging && "opacity-50")}
		>
			<TableCell className="w-12 border-r text-center">
				<button
					type="button"
					className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
					{...attributes}
					{...listeners}
				>
					<GripVerticalIcon className="size-5" />
				</button>
			</TableCell>
			<TableCell className="border-r">
				<group.AppField name={`interfaces[${index}].name`}>
					{/* biome-ignore lint/suspicious/noExplicitAny: generic form field */}
					{(field: any) => <field.TextField />}
				</group.AppField>
			</TableCell>
			<TableCell className="w-24 border-r pr-2 text-center align-middle [&:has([role=checkbox])]:pr-2">
				<div className="flex w-full items-center justify-center *:data-[slot=field]:w-auto *:data-[slot=field]:justify-center">
					<group.AppField name={`interfaces[${index}].configurable`}>
						{/* biome-ignore lint/suspicious/noExplicitAny: generic form field */}
						{(field: any) => <field.CheckboxField />}
					</group.AppField>
				</div>
			</TableCell>
			<TableCell className="w-16 text-center">
				<ActionButton
					icon={Trash2Icon}
					tooltip="Delete"
					variant="destructive"
					onClick={onDelete}
				/>
			</TableCell>
		</TableRow>
	);
}

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
				const values = group.getFieldValue("interfaces");
				const oldIndex = values.findIndex(
					(i, index) => i.id === active.id || String(index) === active.id,
				);
				const newIndex = values.findIndex(
					(i, index) => i.id === over.id || String(index) === over.id,
				);

				if (oldIndex !== -1 && newIndex !== -1) {
					group.moveFieldValues("interfaces", oldIndex, newIndex);
				}
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
								<TableHeader className="bg-muted bg-opacity-50">
									<TableRow>
										<TableHead className="w-12 border-r"></TableHead>
										<TableHead className="border-r">Name</TableHead>
										<TableHead className="w-24 border-r pr-2 text-center [&:has([role=checkbox])]:pr-2">
											Configurable
										</TableHead>
										<TableHead className="w-16"></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									<group.Field name="interfaces" mode="array">
										{(field) => (
											<SortableContext
												items={field.state.value.map(
													(iface, i) => (iface.id as string) || String(i),
												)}
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
															key={iface.id || index}
															id={(iface.id as string) || String(index)}
															index={index}
															group={group}
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
					<Empty className="border border-dashed">
						<EmptyContent>
							<EmptyMedia variant="icon">
								<NetworkIcon />
							</EmptyMedia>
							<EmptyTitle>No Interfaces</EmptyTitle>
							<EmptyDescription>
								No interfaces defined. Click the button below to add one.
							</EmptyDescription>
						</EmptyContent>
					</Empty>
				)}

				<Button
					type="button"
					variant="outline"
					onClick={() => {
						group.pushFieldValue("interfaces", {
							id: crypto.randomUUID(),
							name: "",
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
