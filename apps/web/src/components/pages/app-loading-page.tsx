import { Spinner } from "@web/components/ui/spinner";
import { FlaskConicalIcon } from "lucide-react";

interface AppLoadingPageProps {
	message?: string;
}

function AppLoadingPage({ message = "Loading..." }: AppLoadingPageProps) {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
			<div className="flex flex-row items-center gap-3">
				<div className="flex aspect-square size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
					<FlaskConicalIcon className="size-8" />
				</div>
				<div className="flex flex-col gap-1">
					<h1 className="font-bold text-2xl text-foreground">vLab</h1>
					<p className="font-normal text-muted-foreground text-sm">
						Virtual Laboratory
					</p>
				</div>
			</div>
			<div className="mt-4 flex flex-row items-center gap-3">
				<Spinner className="size-8 text-primary" />
				<p className="font-medium text-muted-foreground text-sm">{message}</p>
			</div>
		</div>
	);
}

export default AppLoadingPage;
