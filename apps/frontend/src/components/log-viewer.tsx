import { Badge } from '@frontend/components/ui/badge';
import { Button } from '@frontend/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@frontend/components/ui/popover';
import { AlertTriangle, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface LogEntry {
  type: 'info' | 'warn' | 'error';
  message: string;
}

interface LogViewerProps {
  logs: LogEntry[];
  emptyMessage?: string;
  className?: string;
}

export function LogViewer({
  logs,
  emptyMessage = 'Initializing...',
  className,
}: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div
      className={`relative flex aspect-video w-full flex-col overflow-hidden bg-slate-950 ${className}`}
    >
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
        <div className="space-y-1.5">
          {logs.map((log, index) => {
            const isLast = index === logs.length - 1;
            return (
              <div
                key={index}
                ref={isLast ? scrollRef : null}
                className="flex items-start gap-3"
              >
                <span className="shrink-0 text-slate-600 select-none">
                  [{new Date().toLocaleTimeString()}]
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={` ${log.type === 'warn' ? 'text-yellow-400' : ''} ${
                      log.type === 'error' ? 'font-semibold text-red-500' : ''
                    } ${log.type === 'info' ? 'text-slate-300' : ''} `}
                  >
                    {log.message}
                  </span>
                </div>
              </div>
            );
          })}
          {logs.length === 0 && (
            <div className="text-slate-500">{emptyMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface LogIssuesButtonProps {
  logs: LogEntry[];
}

export function LogIssuesButton({ logs }: LogIssuesButtonProps) {
  const hasErrors = logs.some((l) => l.type === 'error');
  const issues = logs.filter((l) => l.type === 'warn' || l.type === 'error');

  if (issues.length === 0) return null;

  const issueButtonColor = hasErrors
    ? 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-900/20'
    : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:text-yellow-500 dark:hover:bg-yellow-900/20';

  const issueBadgeColor = hasErrors
    ? 'bg-red-100 text-red-800 border-red-200'
    : 'bg-yellow-100 text-yellow-800 border-yellow-200';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={issueButtonColor}>
          {hasErrors ? (
            <XCircle className="mr-2 h-4 w-4" />
          ) : (
            <AlertTriangle className="mr-2 h-4 w-4" />
          )}
          Issues
          <Badge variant="secondary" className={`ml-2 ${issueBadgeColor}`}>
            {issues.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="rounded-md border border-slate-800 bg-slate-950 p-2 font-mono text-xs text-slate-300">
          <div className="flex justify-between border-b border-slate-800 px-2 py-1.5 font-semibold text-slate-500">
            <span>System Log Issues</span>
            {hasErrors && (
              <span className="text-[10px] tracking-wider text-red-400 uppercase">
                Critical Errors Found
              </span>
            )}
          </div>
          <div className="h-37.5 overflow-y-auto">
            {issues.map((issue, i) => (
              <div
                key={i}
                className="flex items-start gap-2 border-b border-slate-900 px-2 py-2 hover:bg-slate-900/50"
              >
                <span className="mt-0.5 shrink-0">
                  {issue.type === 'error' ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  ) : issue.type === 'warn' ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                  ) : (
                    <div className="h-3.5 w-3.5" />
                  )}
                </span>
                <div>
                  <p
                    className={` ${
                      issue.type === 'error'
                        ? 'text-red-300'
                        : issue.type === 'warn'
                          ? 'text-yellow-200/90'
                          : 'text-slate-300'
                    } `}
                  >
                    {issue.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
