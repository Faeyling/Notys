import { useState, useEffect } from 'react';

export default function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem('notys-dark');
      if (stored !== null) return stored === 'true';
    } catch {
      /* localStorage blocked (iOS private mode SecurityError) — fall through */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('notys-dark', String(dark)); } catch { /* quota or security */ }
  }, [dark]);

  return [dark, setDark];
}
