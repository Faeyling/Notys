import { useState, useEffect } from 'react';

export default function useOrientation() {
  const [landscape, setLandscape] = useState(
    () => window.matchMedia?.('(orientation: landscape)').matches ?? false
  );

  useEffect(() => {
    const mq = window.matchMedia?.('(orientation: landscape)');
    if (!mq) return; /* matchMedia unavailable (tests, headless) */
    const handler = (e) => setLandscape(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return landscape;
}
