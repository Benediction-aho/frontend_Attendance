import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { getToken, loadSession } from './lib/session';
import { clearPersistedCache } from './lib/persist';
import { wakeApi } from './lib/warmup';
import { preloadHome } from './app/preload';
import './index.css';

// Start waking the API at once (it sleeps after a quiet period on the current hosting),
// while the token is read and the first screen renders.
wakeApi();

// The device token is read from IndexedDB before the first render.
void loadSession()
  .then(async () => {
    if (getToken()) preloadHome();
    // Signed out: no screen of a previous account may be restored.
    else await clearPersistedCache();
  })
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
