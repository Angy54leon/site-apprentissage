import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/600.css';
import './index.css';
import { App } from './App';
import { initStore } from './state/store';

const visit = initStore();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App visit={visit} />
  </StrictMode>,
);
