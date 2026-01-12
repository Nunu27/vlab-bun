import { createScopedActionStore } from '@frontend/helper/store';
import type api from '@frontend/lib/api';
import type { TreatyData } from '@frontend/types/api';
import type { AdminItem } from '../../user/admin/-module/types';
import type { LecturerItem } from '../../user/lecturer/-module/types';
import type { StudentItem } from '../../user/student/-module/types';

type AuthUser = TreatyData<typeof api.auth.me.get>['data'];
type User = AdminItem | LecturerItem | StudentItem;

const { Provider, useContext } = createScopedActionStore<User>()([
  ['changePassword', null as unknown as AuthUser],
  'changeUserPassword',
]);

export const DashboardActionProvider = Provider;
export const useDashboardActionStore = useContext;
