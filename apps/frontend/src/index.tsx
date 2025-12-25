import '@frontend/styles/global.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';

const rootEl = document.getElementById('root');

if (rootEl) {
  rootEl.style.height = '100dvh';

  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
