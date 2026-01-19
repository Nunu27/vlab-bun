import { createScopedActionStore } from '@frontend/helper/store';
import type { LabItem } from '../types';

const { Provider, useContext } = createScopedActionStore<LabItem>()(['delete']);

export const LecturerLabActionProvider = Provider;
export const useLecturerLabActionStore = useContext;
