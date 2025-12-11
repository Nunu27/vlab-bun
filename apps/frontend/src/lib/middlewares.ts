import { redirect } from '@tanstack/react-router';
import type { Role } from '@vlab/shared/enums';
import type { RouterContext } from './router';

export const guestRoute =
  () =>
  ({ context }: { context: RouterContext }) => {
    if (context.auth.user) {
      throw redirect({ to: '/' });
    }
  };

export const protectedRoute =
  () =>
  ({ context }: { context: RouterContext }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/login' });
    }
  };

export const privateRoute =
  (roles: Role[]) =>
  ({ context }: { context: RouterContext }) => {
    const user = context.auth.user;

    if (!user || !roles.includes(user.role)) {
      throw redirect({ to: '/' });
    }
  };
