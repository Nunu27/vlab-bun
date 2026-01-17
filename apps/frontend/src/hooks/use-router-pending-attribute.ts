import { router } from '@frontend/lib/router';
import { useEffect } from 'react';

export function useRouterPendingAttribute() {
  useEffect(() => {
    const unsubStart = router.subscribe('onBeforeLoad', () => {
      document.body.setAttribute('data-router-pending', 'true');
    });
    const unsubEnd = router.subscribe('onResolved', () => {
      document.body.removeAttribute('data-router-pending');
    });

    return () => {
      unsubStart();
      unsubEnd();
    };
  }, []);
}
