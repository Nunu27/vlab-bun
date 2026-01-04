import { Button } from '@frontend/components/ui/button';
import { useRouter } from '@tanstack/react-router';
import { HomeIcon, ArrowLeftIcon, AlertTriangleIcon } from 'lucide-react';
import type { FallbackProps } from 'react-error-boundary';

function ErrorPage(props?: FallbackProps) {
  const router = useRouter();

  const handleGoBack = () => {
    router.history.back();
  };

  const handleGoHome = () => {
    router.navigate({ to: '/' });
  };

  const error = props?.error?.message || 'An unexpected error occurred';

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
          <Button
            onClick={handleGoBack}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            <ArrowLeftIcon />
            Go Back
          </Button>
          <Button onClick={handleGoHome} size="lg" className="w-full sm:w-auto">
            <HomeIcon />
            Go to Home
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
