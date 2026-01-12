import { createScopedActionStore } from '@frontend/helper/store';
import type { StudentItem } from '../types';

const { Provider, useContext } = createScopedActionStore<StudentItem>()([
  'create',
  'update',
  'delete',
]);

export const StudentActionProvider = Provider;
export const useStudentActionStore = useContext;
