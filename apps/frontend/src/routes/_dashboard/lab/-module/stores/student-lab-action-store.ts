import { createScopedActionStore } from '@frontend/helper/store';
import type { LabItem } from '../types';

const { Provider, useContext } = createScopedActionStore<LabItem>()([
  'start',
  'stop',
]);

export const StudentLabActionProvider = Provider;
export const useStudentLabActionStore = useContext;
