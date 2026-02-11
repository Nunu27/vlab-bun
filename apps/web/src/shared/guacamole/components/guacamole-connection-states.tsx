import { Spinner } from "@web/components/ui/spinner";
import { AlertCircle } from "lucide-react";
import type { ConnectionState } from "../stores/guacamole-connection-store";

interface ConnectionStatesProps {
	state: ConnectionState | "waiting";
	errorMessage?: string | null;
	title?: string;
	description?: string;
}

type StateKey = Exclude<ConnectionState, "connected"> | "waiting";

interface StateConfig {
	defaultTitle: string;
	defaultDescription: string | null;
	showSpinner?: boolean;
	showIcon?: boolean;
}

const STATE_CONFIG: Record<StateKey, StateConfig> = {
	connecting: {
		defaultTitle: "Connecting to Device",
		defaultDescription: "Establishing secure tunnel...",
		showSpinner: true,
	},
	waiting: {
		defaultTitle: "Waiting",
		defaultDescription: "Please wait...",
		showSpinner: true,
	},
	disconnected: {
		defaultTitle: "Session Ended",
		defaultDescription: null,
	},
	error: {
		defaultTitle: "Connection Failed",
		defaultDescription: null,
		showIcon: true,
	},
} as const;

export const GuacamoleConnectionStates: React.FC<ConnectionStatesProps> = ({
	state,
	errorMessage,
	title,
	description,
}) => {
	if (state === "connected") return null;

	const config = STATE_CONFIG[state];
	const displayTitle = title ?? config.defaultTitle;
	const displayDescription =
		description ??
		(state === "error" ? errorMessage : config.defaultDescription);

	return (
		<div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background p-6 text-center backdrop-blur-sm">
			{config.showSpinner && <Spinner className="size-10 text-primary" />}

			{config.showIcon && (
				<div className="rounded-full bg-destructive/10 p-4">
					<AlertCircle className="size-10 text-destructive" />
				</div>
			)}

			<div className="flex flex-col gap-2">
				<h3 className="font-semibold text-foreground text-lg">
					{displayTitle}
				</h3>
				{displayDescription && (
					<p className="font-medium text-muted-foreground text-sm">
						{displayDescription}
					</p>
				)}
			</div>
		</div>
	);
};
