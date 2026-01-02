import { useAuthStore } from '@frontend/stores/auth';
import { redirect } from '@tanstack/react-router';
import type { Role } from '@vlab/shared/enums';

export const guestRoute = () => () => {
  const user = useAuthStore.getState().user;

  if (user) {
    throw redirect({ to: '/' });
  }
};

export const protectedRoute = () => () => {
  const user = useAuthStore.getState().user;

  if (!user) {
    throw redirect({ to: '/login' });
  }
};

export const privateRoute = (roles: Role[]) => () => {
  const user = useAuthStore.getState().user;

  if (!user || !roles.includes(user.role)) {
    throw redirect({ to: '/' });
  }
};
