import { Button } from "@web/components/ui/button";
import { useWSAction } from "@web/hooks/ws";
import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SessionSubmitButton({ sessionId }: { sessionId: string }) {
	const { send: emit } = useWSAction("lab-session:[sessionId]:submit");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async () => {
		setIsSubmitting(true);
		emit({
			params: { sessionId },
			onError: (err) => {
				console.error(err);
				toast.error("Failed to submit");
			},
		});
	};

	return (
		<Button
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
