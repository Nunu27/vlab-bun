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
import { Empty, EmptyDescription } from "@web/components/ui/empty";
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
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react";

type InterfaceEntry = DeviceTemplateInterface & {
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
					<group.AppField name="name">
						{(field) => <field.TextField />}
					</group.AppField>
				</TableCell>
				<TableCell className="w-24 border-r pr-2 text-center align-middle [&:has([role=checkbox])]:pr-2">
					<div className="flex w-full items-center justify-center *:data-[slot=field]:w-auto *:data-[slot=field]:justify-center">
						<group.AppField name="configurable">
							{(field) => <field.CheckboxField />}
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
				group.moveFieldValues("interfaces", Number(active.id), Number(over.id));
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
					<Empty className="border border-dashed">
						<EmptyDescription>
							No interfaces defined. Click the button below to add one.
						</EmptyDescription>
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
