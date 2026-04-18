import { useState } from 'react';
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
 */
export default function App() {
  const [page, setPage]         = useState('home');
  const [dark, setDark]         = useDarkMode();
  const [animated, setAnimated] = useState(() => {
    const s = localStorage.getItem('notys-animations');
    return s === null ? true : s === 'true';
  });

  const handleToggleAnimations = (v) => {
    setAnimated(v);
    localStorage.setItem('notys-animations', String(v));
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Home is always mounted, hidden behind Backup */}
      <div style={{ visibility: page === 'backup' ? 'hidden' : 'visible' }}>
        <Home
          dark={dark}
          setDark={setDark}
          animated={animated}
          onGoBackup={() => setPage('backup')}
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
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
