import { Button } from '@frontend/components/ui/button';
import { Link, useRouter } from '@tanstack/react-router';
import { ArrowLeftIcon, HomeIcon } from 'lucide-react';

function NotFoundPage() {
  const router = useRouter();

  const handleGoBack = () => {
    router.history.back();
  };

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-hidden bg-linear-to-br p-6">
      <div className="z-10 w-full max-w-2xl space-y-8 text-center">
        {/* Main 404 Display */}
        <div className="space-y-4">
          <div className="from-primary via-primary/80 to-primary/60 bg-linear-to-br bg-clip-text text-[12rem] leading-none font-bold text-transparent drop-shadow-2xl md:text-[16rem]">
            404
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Page Not Found
            </h1>
            <p className="text-muted-foreground mx-auto max-w-md text-lg md:text-xl">
              The page you are looking for does not exist or has been moved to a
              different location.
            </p>
          </div>
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
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <Link to="/">
              <HomeIcon />
              Go to Home
            </Link>
          </Button>
        </div>

        {/* Additional helpful text */}
        <p className="text-muted-foreground pt-8 text-sm">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}

export default NotFoundPage;
