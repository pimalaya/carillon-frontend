import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";

// Requires the generated service worker in public/ (`npm run mocks:init` once).
export const worker = setupWorker(...handlers);
