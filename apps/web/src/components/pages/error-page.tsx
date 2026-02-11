import {
	type ErrorComponentProps,
	Link,
	useCanGoBack,
} from "@tanstack/react-router";
import { Button } from "@web/components/ui/button";
import { router } from "@web/lib/router";
import { AlertTriangleIcon, ArrowLeftIcon, HomeIcon } from "lucide-react";

function ErrorPage(props: ErrorComponentProps) {
	const canGoBack = useCanGoBack();

	const error = props.error?.message || "An unexpected error occurred";

	return (
		<div className="flex h-full flex-col items-center justify-center overflow-hidden bg-linear-to-br p-6">
			<div className="z-10 w-full max-w-2xl space-y-8 text-center">
				{/* Main Error Display */}
				<div className="space-y-4">
					<div className="flex justify-center">
						<AlertTriangleIcon className="h-24 w-24 text-destructive" />
					</div>

					<div className="space-y-2">
						<h1 className="font-bold text-3xl tracking-tight md:text-4xl">
							Something Went Wrong
						</h1>
						<p className="mx-auto max-w-md text-lg text-muted-foreground md:text-xl">
							An unexpected error occurred while processing your request.
						</p>
					</div>

					{/* Error Details */}
					{error && (
						<div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
							<p className="font-mono text-destructive text-sm">{error}</p>
						</div>
					)}
				</div>

				{/* Action Buttons */}
				<div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
					{canGoBack && (
						<Button
							onClick={() => router.history.back()}
							variant="outline"
							size="lg"
							className="w-full sm:w-auto"
						>
							<ArrowLeftIcon />
							Go Back
						</Button>
					)}
					<Button size="lg" className="w-full sm:w-auto" asChild>
						<Link to="/">
							<HomeIcon />
							Go to Home
						</Link>
					</Button>
				</div>

				{/* Additional helpful text */}
				<p className="pt-8 text-muted-foreground text-sm">
					If this problem persists, please contact support.
				</p>
			</div>
		</div>
	);
}

export default ErrorPage;
