import { Spinner } from "@web/components/ui/spinner";

interface LoadingPageProps {
	message?: string;
}

function LoadingPage({ message = "Loading..." }: LoadingPageProps) {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
			<Spinner className="size-10 text-primary" />
			<p className="font-medium text-foreground">{message}</p>
		</div>
	);
}

export default LoadingPage;
