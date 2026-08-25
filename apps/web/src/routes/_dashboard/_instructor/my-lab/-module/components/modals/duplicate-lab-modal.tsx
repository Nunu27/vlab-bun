import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@web/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@web/components/ui/dialog";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { useModalState } from "@web/hooks/state/use-modal-state";
import api from "@web/lib/api";
import { useEffect, useState } from "react";
import { useLabModalStore } from "../../stores/lab-modal-store";

export function DuplicateLabModal() {
	const store = useLabModalStore();
	const { open, data } = useModalState(store.use.duplicate());
	const actions = store.use.actions();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [name, setName] = useState("");

	useEffect(() => {
		if (data) setName(`${data.name} (Copy)`);
	}, [data]);

	const { mutate, isPending } = api
		.lab({ labId: data?.id ?? "" })
		.duplicate.post.useMutation({
			onSuccess: ({ id }) => {
				api.lab.pagination.post.invalidateQuery(queryClient);
				actions.duplicate.close();
				navigate({ to: "/my-lab/$labId/edit", params: { labId: id } });
			},
		});

	if (!data) return null;

	return (
		<Dialog open={open} onOpenChange={actions.duplicate.close}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Duplicate Lab</DialogTitle>
					<DialogDescription>
						Create a copy of <strong>{data.name}</strong> as a new draft lab.
						You'll be taken to the edit page to make further changes.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						mutate({ name });
					}}
				>
					<div className="grid gap-2 py-4">
						<Label htmlFor="duplicate-lab-name">New Lab Name</Label>
						<Input
							id="duplicate-lab-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter lab name..."
							autoFocus
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={actions.duplicate.close}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending || !name.trim()}>
							{isPending ? "Duplicating..." : "Duplicate"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
