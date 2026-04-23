import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/* Request persistent storage so the browser won't silently evict IndexedDB data.
   Granted automatically when the PWA is installed or when the user regularly visits. */
navigator.storage?.persist?.().catch(() => {});

/* ── Service Worker registration ─────────────────────────────────────────
   Enables offline support and is required for Google Play TWA installability.
   Registered on 'load' so it never delays the first render.               */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => { /* SW registration is a progressive enhancement — fail silently */ });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
