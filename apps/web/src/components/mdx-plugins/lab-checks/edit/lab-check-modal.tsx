import type { LabRequest } from "@vlab/shared/schemas";
import { Button } from "@web/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@web/components/ui/dialog";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@web/components/ui/empty";
import { ScrollArea } from "@web/components/ui/scroll-area";
import { useTypedAppFormContext } from "@web/hooks/form/use-app-form";
import { useModalState } from "@web/hooks/state/use-modal-state";
import { useLabChecksModalStore } from "../stores/lab-checks-modal-store";
import { LabCheckForm } from "./lab-check-form";

function LabCheckModal() {
	const store = useLabChecksModalStore();
	const { open, data } = useModalState(store.use.configure());
	const actions = store.use.actions();

	const form = useTypedAppFormContext<
		LabRequest,
		never,
		never,
		never,
		never,
		never,
		never,
		never,
		never,
		never,
		never,
		never
	>({});

	if (!data) return null;

	const { ids, addCheck, removeCheck } = data;

	return (
		<Dialog
			open={open}
			onOpenChange={() => {
				if (!ids.length) data.removeSelf();
				actions.configure.close();
			}}
		>
			<DialogContent className="min-w-xl">
				<DialogHeader>
					<DialogTitle>Configure Lab Checks</DialogTitle>
					<DialogDescription>
						Configure automated checks to validate the lab state.
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="-mx-4 -my-2 max-h-[60vh] px-2">
					{ids.length === 0 ? (
						<Empty className="border">
							<EmptyHeader>
								<EmptyTitle>No checks defined</EmptyTitle>
								<EmptyDescription>
									Click "Add Check" below to create one.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						ids.map((id) => (
							<LabCheckForm
								key={id}
								form={form}
								fields={`checks.${id}`}
								onRemove={() => removeCheck(id)}
							/>
						))
					)}
				</ScrollArea>

				<DialogFooter className="sm:justify-start">
					<Button type="button" className="w-full" onClick={addCheck}>
						+ Add Check
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default LabCheckModal;
