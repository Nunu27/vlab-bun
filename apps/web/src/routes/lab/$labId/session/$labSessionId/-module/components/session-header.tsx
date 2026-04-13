import { ModeToggle } from "@web/components/buttons/mode-toggle";
import { PageHeading } from "@web/components/sections/page-heading";
import { ScoreIndicator } from "./score-indicator";
import { SessionSubmitButton } from "./session-submit-button";
import { SessionTimer } from "./session-timer";

export function SessionHeader({
	labId,
	sessionId,
	name,
	dueDate,
}: {
	labId: string;
	sessionId: string;
	name: string;
	dueDate: Date;
}) {
	return (
		<header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
			<PageHeading
				title={name}
				back={{ to: "/lab/$labId", params: { labId } }}
			/>
			<div className="flex items-center gap-4">
				<ScoreIndicator />
				<SessionTimer dueDate={dueDate} />
				<SessionSubmitButton sessionId={sessionId} />
				<ModeToggle />
			</div>
		</header>
	);
}
