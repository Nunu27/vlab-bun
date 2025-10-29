import type { Treaty } from '@elysiajs/eden';
import api from '@frontend/lib/api';
import { router } from '@frontend/lib/router';
import { errorHandler } from '@frontend/lib/utils';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

type LoginData = Parameters<typeof api.auth.login.post>[0];
type AuthUser = Exclude<Treaty.Data<typeof api.auth.me.get>['data'], undefined>;

type AuthUtils = {
  login: (_: LoginData) => void;
  logout: () => void;
  ensureData: () => Promise<AuthUser | null>;
};

type AuthData = { user?: AuthUser | null } & AuthUtils;

const options = queryOptions({
  queryKey: ['me'],
  queryFn: () =>
    api.auth.me.get().then(({ data: response }) => response?.data ?? null),
  retry: false,
});

function useAuth(): AuthData {
  const client = useQueryClient();
  const query = useQuery(options);

  useEffect(() => {
    router.invalidate();
  }, [query.data]);

  const utils: AuthUtils = {
    login: (body) => {
      errorHandler(api.auth.login.post(body), {
        callback: () => {
          client.invalidateQueries({ queryKey: ['me'] });
        },
      });
    },
    logout: () => {
      errorHandler(api.auth.logout.post(), {
        callback: () => {
          client.invalidateQueries({ queryKey: ['me'] });
        },
      });
    },
    ensureData: () => {
      return client.ensureQueryData(options);
    },
  };

  return { ...utils, user: query.isPending ? undefined : query.data };
}

export { useAuth };
export type { AuthData };
