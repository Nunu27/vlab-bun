import { createScopedActionStore } from '@frontend/helper/store';
import type { StudyProgramItem } from '../types';

const { Provider, useContext } = createScopedActionStore<StudyProgramItem>()([
  'create',
  'update',
  'delete',
]);

export const StudyProgramActionProvider = Provider;
export const useStudyProgramActionStore = useContext;
