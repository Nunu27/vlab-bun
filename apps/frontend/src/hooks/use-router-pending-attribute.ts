import { router } from '@frontend/lib/router';
import { useEffect, useRef } from 'react';

export function useRouterPendingAttribute() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubStart = router.subscribe('onBeforeLoad', () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.body.setAttribute('data-router-pending', 'true');
    });
    const unsubEnd = router.subscribe('onResolved', () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        document.body.removeAttribute('data-router-pending');
        timeoutRef.current = null;
      }, 100);
    });

    return () => {
      unsubStart();
      unsubEnd();
    };
  }, []);
}
