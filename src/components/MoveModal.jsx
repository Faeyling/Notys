import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, Home } from 'lucide-react';
import { PALETTE } from '@/lib/constants';

export default function MoveModal({ show, item, folders = [], onClose, onMove }) {
  if (!show || !item) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg rounded-t-3xl p-6 pb-10 shadow-2xl"
          style={{ background: 'white', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
        >
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="font-bold text-base" style={{ fontFamily: 'Quicksand, sans-serif', color: '#111827' }}>
              Déplacer vers...
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F5F5F5' }}>
              <X size={16} style={{ color: '#6B7280' }} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 flex flex-col gap-2">
            <button
              onClick={() => { onMove(item, null); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB' }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#E5E7EB' }}>
                <Home size={15} style={{ color: '#374151' }} />
              </div>
              <span className="font-semibold text-sm" style={{ fontFamily: 'Quicksand, sans-serif', color: '#374151' }}>
                Accueil (pas de dossier)
              </span>
            </button>

            {folders.map(f => {
              const pal = PALETTE.find(p => p.bg === f.color) || PALETTE[8];
              return (
                <button
                  key={f.id}
                  onClick={() => { onMove(item, f); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: `${pal.bg}33`, border: `1.5px solid ${pal.bg}` }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: pal.bg }}>
                    <Folder size={15} style={{ color: pal.fg }} />
                  </div>
                  <span className="font-semibold text-sm" style={{ fontFamily: 'Quicksand, sans-serif', color: pal.fg }}>
                    {f.name}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
