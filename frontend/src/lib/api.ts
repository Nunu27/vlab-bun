import { treaty } from '@elysiajs/eden';
import type { App } from 'vlab-backend';

const client = treaty<App>(window.location.origin);
export default client.api;
