import { treaty } from '@elysiajs/eden';
import { edenQuery } from '@frontend/helper/api';
import { useAppForm } from '@frontend/hooks/use-app-form';
import { toast } from 'sonner';
import type { App } from 'vlab-backend/server';

const client = treaty<App>(window.location.origin);
export default edenQuery(client.api, { toast, useForm: useAppForm });
