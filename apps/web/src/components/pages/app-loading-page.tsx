import { Spinner } from "@web/components/ui/spinner";
import { FlaskConicalIcon } from "lucide-react";

interface AppLoadingPageProps {
	message?: string;
}

function AppLoadingPage({ message = "Loading..." }: AppLoadingPageProps) {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
			<div className="flex flex-row items-center gap-3">
				<div className="bg-primary text-primary-foreground flex aspect-square size-16 items-center justify-center rounded-2xl shadow-lg">
					<FlaskConicalIcon className="size-8" />
				</div>
				<div className="flex flex-col gap-1">
					<h1 className="text-foreground text-2xl font-bold">vLab</h1>
					<p className="text-muted-foreground text-sm font-normal">
						Virtual Laboratory
					</p>
				</div>
			</div>
			<div className="mt-4 flex flex-row items-center gap-3">
				<Spinner className="text-primary size-8" />
				<p className="text-muted-foreground text-sm font-medium">{message}</p>
			</div>
		</div>
	);
}

export default AppLoadingPage;
