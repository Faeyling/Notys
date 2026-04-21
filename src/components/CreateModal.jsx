import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, FileText, Folder } from 'lucide-react';
import { PALETTE, DEFAULT_COLOR } from '@/lib/constants';
import ColorPicker from './ColorPicker';

export default function CreateModal({
  show,
  onClose,
  onSave,
  folders = [],
  parentFolderId = null,
  defaultColor = null,
  /** 'note' | 'folder' | 'voice' — pre-selects the tab when the modal opens */
  defaultType = 'note',
}) {
  const [type, setType]         = useState(defaultType || 'note');
  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [color, setColor]       = useState(defaultColor || DEFAULT_COLOR);
  const [folderId, setFolderId] = useState(parentFolderId || '');
  const [attempted, setAttempted] = useState(false);
  const [saved, setSaved] = useState(false);

  const modalRef  = useRef(null);
  const titleRef  = useRef(null);

  useEffect(() => {
    if (show) {
      setTitle('');
      setContent('');
      setColor(defaultColor || DEFAULT_COLOR);
      setFolderId(parentFolderId || '');
      setType(defaultType || 'note');
      setAttempted(false);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [show, parentFolderId, defaultColor, defaultType]);

  const trapFocus = (e) => {
    if (e.key !== 'Tab') return;
    const focusable = modalRef.current?.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };

  const handleSave = () => {
    if (!title.trim()) { setAttempted(true); titleRef.current?.focus(); return; }
    setSaved(true);
    onSave({ title: title.trim(), content, color, is_favorite: false, folder_id: folderId || null, type });
    setTimeout(() => { setSaved(false); onClose(); }, 600);
  };

  if (!show) return null;

  const tabs = [
    { id: 'note',   label: 'Note',    Icon: FileText },
    { id: 'folder', label: 'Dossier', Icon: Folder   },
    { id: 'voice',  label: 'Vocale',  Icon: Mic      },
  ];

  const pal = PALETTE.find(p => p.bg === color) || PALETTE[8];

  return (
    <AnimatePresence>
      <motion.div
        key="create-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={type === 'folder' ? 'Créer un dossier' : 'Créer une note'}
      >
        <motion.div
          ref={modalRef}
          key="create-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          onKeyDown={trapFocus}
          className="w-full max-w-lg rounded-t-3xl p-6 pb-10 shadow-2xl"
          style={{ background: 'white' }}
        >
          {/* Title row */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-base" style={{ fontFamily: 'Quicksand, sans-serif', color: '#111827' }}>
              Créer {type === 'folder' ? 'un dossier' : 'une note'}
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

          {/* Type tabs */}
          <div className="flex rounded-2xl overflow-hidden mb-5 p-1 gap-1" style={{ background: '#F5F5F5' }} role="tablist">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={type === id}
                aria-controls="create-modal-panel"
                onClick={() => setType(id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all duration-200"
                style={{
                  background: type === id ? pal.bg : 'transparent',
                  color: type === id ? pal.fg : '#9CA3AF',
                  fontFamily: 'Quicksand, sans-serif',
                }}
              >
                <Icon size={13} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          <div id="create-modal-panel" role="tabpanel" className="space-y-3">
            <label className="sr-only" htmlFor="create-title">
              {type === 'folder' ? 'Nom du dossier' : 'Titre de la note'} *
            </label>
            <div>
              <input
                id="create-title"
                ref={titleRef}
                value={title}
                onChange={e => { setTitle(e.target.value); if (attempted) setAttempted(false); }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder={type === 'folder' ? 'Nom du dossier...' : 'Titre de la note...'}
                aria-required="true"
                aria-invalid={attempted && !title.trim()}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none border-2 transition-all"
                style={{
                  borderColor: attempted && !title.trim() ? '#ef4444' : pal.bg,
                  background: attempted && !title.trim() ? '#fef2f2' : `${pal.bg}22`,
                  color: '#111827',
                  fontFamily: 'Quicksand, sans-serif',
                }}
              />
              {attempted && !title.trim() && (
                <p className="text-xs mt-1 px-1" style={{ color: '#ef4444', fontFamily: 'Quicksand, sans-serif' }}>
                  Ce champ est requis
                </p>
              )}
            </div>

            {type === 'note' && (
              <>
                <label className="sr-only" htmlFor="create-content">Contenu de la note</label>
                <textarea
                  id="create-content"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Contenu (Markdown supporté)..."
                  rows={3}
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none border-2 transition-all resize-none"
                  style={{
                    borderColor: pal.bg,
                    background: `${pal.bg}22`,
                    color: '#111827',
                    fontFamily: 'Quicksand, sans-serif',
                  }}
                />
              </>
            )}

            {type === 'voice' && (
              <div
                className="rounded-2xl px-4 py-3 text-sm text-center border-2"
                style={{ borderColor: pal.bg, background: `${pal.bg}22`, color: pal.fg }}
              >
                <Mic size={20} className="mx-auto mb-1" aria-hidden="true" />
                <p style={{ fontFamily: 'Quicksand, sans-serif', fontSize: 12 }}>
                  La note vocale sera enregistrée après création
                </p>
              </div>
            )}

            {type !== 'folder' && (
              <>
                <label className="sr-only" htmlFor="create-folder-select">Dossier</label>
                <select
                  id="create-folder-select"
                  value={folderId}
                  onChange={e => setFolderId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none border-2 appearance-none"
                  style={{
                    borderColor: pal.bg,
                    background: `${pal.bg}22`,
                    color: folderId ? '#111827' : '#9CA3AF',
                    fontFamily: 'Quicksand, sans-serif',
                  }}
                >
                  <option value="">Aucun dossier</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}>
                Couleur
              </p>
              <ColorPicker value={color} onChange={setColor} />
            </div>

            <motion.button
              onClick={handleSave}
              disabled={!title.trim() || saved}
              whileHover={{ scale: title.trim() && !saved ? 1.02 : 1 }}
              whileTap={{ scale: title.trim() && !saved ? 0.97 : 1 }}
              className="w-full py-3.5 rounded-2xl font-bold text-sm mt-1"
              style={{
                background: saved ? '#22c55e' : title.trim() ? pal.bg : '#F3F4F6',
                color: saved ? 'white' : title.trim() ? pal.fg : '#9CA3AF',
                fontFamily: 'Quicksand, sans-serif',
                boxShadow: saved ? '0 4px 20px #22c55e88' : title.trim() ? `0 4px 20px ${pal.bg}88` : 'none',
                transition: 'all 0.2s',
              }}
            >
              {saved ? '✅ Créé !' : 'Créer ✨'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
