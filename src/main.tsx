import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from './App';
import { config } from './lib/config';

// In mock mode, start the MSW worker before the app so the very first query is
// intercepted. Requires the generated worker (`npm run mocks:init`) once.
async function enableMocking() {
  if (!config.mocksEnabled) return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
