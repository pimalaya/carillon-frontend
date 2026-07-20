import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

// Browser MSW worker. Started from main.tsx when mocks are enabled. Requires the
// generated service worker in public/ (run `npm run mocks:init` once).
export const worker = setupWorker(...handlers);
