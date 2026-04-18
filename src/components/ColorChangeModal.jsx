import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import ColorPicker from './ColorPicker';

export default function ColorChangeModal({ show, item, onClose, onChange }) {
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
          style={{ background: 'white' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-base" style={{ fontFamily: 'Quicksand, sans-serif', color: '#111827' }}>
              Changer la couleur
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F5F5F5' }}>
              <X size={16} style={{ color: '#6B7280' }} />
            </button>
          </div>
          <ColorPicker value={item.color} onChange={color => { onChange(item, color); onClose(); }} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
