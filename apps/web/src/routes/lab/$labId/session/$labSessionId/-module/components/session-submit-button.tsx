import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@web/components/ui/button";
import api from "@web/lib/api";
import { Send } from "lucide-react";

import { toast } from "sonner";

export function SessionSubmitButton({ sessionId }: { sessionId: string }) {
	const queryClient = useQueryClient();

	const { mutate: emit, isPending: isSubmitting } = api.dashboard.student[
		"lab-sessions"
	]({ sessionId }).submit.post.useMutation({
		onSuccess: () => {
			toast.success("Session submitted successfully");
			api.dashboard.invalidateQuery(queryClient);
		},
		onError: (err) => {
			console.error(err);
			toast.error("Failed to submit");
		},
	});

	const handleSubmit = async () => {
		emit();
	};

	return (
		<Button
			data-tour="submit-button"
			variant="default"
			size="sm"
			className="gap-2"
			disabled={isSubmitting}
			onClick={handleSubmit}
		>
			<Send className="size-4" />
			Submit
		</Button>
	);
}
