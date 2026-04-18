import { motion, AnimatePresence } from 'framer-motion';
import Mascot from './Mascot';

export default function BackupReminderModal({ show, onClose, onGoBackup }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center"
            style={{ background: 'white' }}
          >
            <div className="flex justify-center mb-3">
              <Mascot variant="backpack" size={90} />
            </div>
            <h2 className="font-bold text-lg mb-2" style={{ fontFamily: '"Cherry Bomb One", cursive', color: '#111827' }}>
              C'est dimanche !
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ fontFamily: 'Quicksand, sans-serif', color: '#4B5563' }}>
              Noty te rappelle de sauvegarder tes notes sur un support externe sécurisé de ton choix. Mieux vaut prévenir que guérir ! 🐾
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: '#F3F4F6', color: '#374151', fontFamily: 'Quicksand, sans-serif' }}
              >
                Plus tard
              </button>
              <button
                onClick={() => { onGoBackup(); onClose(); }}
                className="flex-1 py-3 rounded-2xl font-bold text-sm"
                style={{ background: '#ffadad', color: '#7f1d1d', fontFamily: 'Quicksand, sans-serif' }}
              >
                Sauvegarder 💾
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
