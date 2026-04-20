import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Home   from '@/pages/Home';
import Backup from '@/pages/Backup';
import useDarkMode from '@/hooks/useDarkMode';

/**
 * App — root component.
 *
 * Owns two pieces of global UI state so every page stays in sync:
 *   dark      – colour scheme (persisted in localStorage)
 *   animated  – decorative animations on/off (persisted in localStorage)
 *
 * Hardware back-button interception (Android / PWA):
 *   A single popstate listener is registered on mount.
 *   homeBackRef holds a function registered by Home that closes
 *   the topmost layer (note → folder). If Home has nothing to close,
 *   App falls back to closing the Backup page.
 */
export default function App() {
  const [page, setPage]         = useState('home');
  const [dark, setDark]         = useDarkMode();
  const [dataVersion, setDataVersion] = useState(0); // bumped after import to reload Home
  const [animated, setAnimated] = useState(() => {
    const s = localStorage.getItem('notys-animations');
    return s === null ? true : s === 'true';
  });

  /* ── Back-button interception ─────────────────────────── */
  const homeBackRef = useRef(() => false); // set by Home
  const pageRef     = useRef(page);
  useEffect(() => { pageRef.current = page; }, [page]);

  useEffect(() => {
    /* Push a dummy entry so the very first back gives us a popstate event */
    window.history.pushState({ notys: true }, '');

    const onPop = () => {
      /* Always re-push so back is interceptable again next time */
      window.history.pushState({ notys: true }, '');

      /* 1. Home layers (note / folder) */
      if (homeBackRef.current()) return;
      /* 2. Backup page */
      if (pageRef.current === 'backup') { setPage('home'); }
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []); /* mount only — refs carry the current values */

  const handleToggleAnimations = (v) => {
    setAnimated(v);
    localStorage.setItem('notys-animations', String(v));
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', height: '100dvh' }}>
      {/* Home is always mounted, hidden behind Backup */}
      <div style={{ visibility: page === 'backup' ? 'hidden' : 'visible' }}>
        <Home
          dark={dark}
          setDark={setDark}
          animated={animated}
          onGoBackup={() => setPage('backup')}
          onRegisterBack={fn => { homeBackRef.current = fn; }}
          dataVersion={dataVersion}
        />
      </div>

      {/* Backup slides in on top */}
      <AnimatePresence>
        {page === 'backup' && (
          <motion.div
            key="backup"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100 }}
          >
            <Backup
              onBack={() => setPage('home')}
              dark={dark}
              animated={animated}
              onToggleAnimations={handleToggleAnimations}
              onImportSuccess={() => setDataVersion(v => v + 1)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
