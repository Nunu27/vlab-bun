import { Button } from '@frontend/components/ui/button';
import { router } from '@frontend/lib/router';
import {
  Link,
  useCanGoBack,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { HomeIcon, ArrowLeftIcon, AlertTriangleIcon } from 'lucide-react';

function ErrorPage(props: ErrorComponentProps) {
  const canGoBack = useCanGoBack();

  const error = props.error?.message || 'An unexpected error occurred';

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-hidden bg-linear-to-br p-6">
      <div className="z-10 w-full max-w-2xl space-y-8 text-center">
        {/* Main Error Display */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <AlertTriangleIcon className="text-destructive h-24 w-24" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Something Went Wrong
            </h1>
            <p className="text-muted-foreground mx-auto max-w-md text-lg md:text-xl">
              An unexpected error occurred while processing your request.
            </p>
          </div>

          {/* Error Details */}
          {error && (
            <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-4">
              <p className="text-destructive font-mono text-sm">{error}</p>
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
        <p className="text-muted-foreground pt-8 text-sm">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}

export default ErrorPage;
