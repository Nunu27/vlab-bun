import { Spinner } from '@frontend/components/ui/spinner';

interface LoadingPageProps {
  message?: string;
}

function LoadingPage({ message = 'Loading...' }: LoadingPageProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
      <Spinner className="text-primary size-10" />
      <p className="text-foreground font-medium">{message}</p>
    </div>
  );
}

export default LoadingPage;
