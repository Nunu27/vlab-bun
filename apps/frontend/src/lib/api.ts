import { treaty } from '@elysiajs/eden';
import type { App } from 'vlab-backend/server';

const client = treaty<App>(window.location.origin, {
    onRequest(_, options) {
        if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
            const body = options.body as Record<string, any>;
            const hasFile = Object.values(body).some((v) => v instanceof File || v instanceof Blob || v instanceof FileList);

            if (hasFile) {
                for (const key in body) {
                    const value = body[key];
                    if (
                        typeof value === "object" &&
                        value !== null &&
                        !(value instanceof File) &&
                        !(value instanceof Blob) &&
                        !(value instanceof FileList)
                    ) {
                        body[key] = JSON.stringify(value);
                    }
                }
            }
        }
    },
});
export default client.api;
