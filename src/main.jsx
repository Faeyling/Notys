import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/* Request persistent storage so the browser won't silently evict IndexedDB data.
   Granted automatically when the PWA is installed or when the user regularly visits. */
navigator.storage?.persist?.().catch(() => {});

/* Service Worker is registered automatically by vite-plugin-pwa (injectRegister: 'auto').
   The generated Workbox SW pre-caches all build assets for full offline support. */

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
