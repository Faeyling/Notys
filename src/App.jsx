import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Home from '@/pages/Home';
import Backup from '@/pages/Backup';

export default function App() {
  const [page, setPage] = useState('home');
  const dark = document.documentElement.classList.contains('dark');

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Home is always mounted, hidden when backup is open */}
      <div style={{ visibility: page === 'backup' ? 'hidden' : 'visible' }}>
        <Home onGoBackup={() => setPage('backup')} />
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
            <Backup onBack={() => setPage('home')} dark={dark} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
