import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import ColorPicker from './ColorPicker';

export default function ColorChangeModal({ show, item, onClose, onChange }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (show) setTimeout(() => modalRef.current?.focus(), 50);
  }, [show]);

  const trapFocus = (e) => {
    if (e.key !== 'Tab') return;
    const focusable = modalRef.current?.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };

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
        role="dialog"
        aria-modal="true"
        aria-label="Changer la couleur"
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          onKeyDown={trapFocus}
          className="w-full max-w-lg rounded-t-3xl p-6 pb-10 shadow-2xl outline-none"
          style={{ background: 'white' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-base" style={{ fontFamily: 'Quicksand, sans-serif', color: '#111827' }}>
              Changer la couleur
            </h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: '#F5F5F5' }}
            >
              <X size={16} style={{ color: '#6B7280' }} />
            </button>
          </div>
          <ColorPicker value={item.color} onChange={color => { onChange(item, color); onClose(); }} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
