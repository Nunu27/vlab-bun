import { treaty } from '@elysiajs/eden';
import { edenQuery } from '@frontend/helper/api';
import type { App } from 'vlab-backend/server';

const client = treaty<App>(window.location.origin);
export default edenQuery(client.api);
