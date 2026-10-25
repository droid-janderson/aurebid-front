import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/fraunces/wght-italic.css';
import '@fontsource-variable/sora';
import '@fontsource-variable/jetbrains-mono';
import '@/styles/index.css';
import { App } from '@/App';
import { env } from '@/utils/env';

async function enableMocking() {
  if (!env.useMocks) return;

  const { worker } = await import('@/mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}

enableMocking()
  .catch((error: unknown) => {
    console.error('Não foi possível iniciar o ambiente de demonstração.', error);
  })
  .finally(() => {
    const container = document.getElementById('root');
    if (!container) return;

    createRoot(container).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>,
    );
  });
