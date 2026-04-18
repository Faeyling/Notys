import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Folder, Star, ArrowRight, Trash2, Palette, Play, Mic } from 'lucide-react';
import { PALETTE } from '@/lib/constants';
import useLongPress from '@/hooks/useLongPress';

export default function GridCard({
  item, type, onOpen, onToggleStar, onDelete, onMove, onColorChange, isDragging, dark,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const btnRef = useRef(null);

  /* Palette — in dark mode notes blend with the page background */
  const pal = PALETTE.find(p => p.bg === item.color) || PALETTE[8];
  const isDarkNote = dark && type === 'note';
  const cardBg    = isDarkNote ? '#1a1a2e' : pal.bg;
  const titleColor = isDarkNote ? pal.bg   : pal.fg;
  const metaColor  = isDarkNote ? `${pal.bg}99` : `${pal.fg}99`;
  const cardBorder = isDarkNote ? `1px solid ${pal.bg}40` : 'none';

  const lp = useLongPress(
    () => openMenu(),
    () => onOpen(item),
    550,
  );

  const stopProp = fn => e => { e.stopPropagation(); fn(); };

  /* Open menu: compute fixed position from button rect so it escapes any container clip */
  const openMenu = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setMenuOpen(true);
  };

  const handlePlayAudio = (e) => {
    e.stopPropagation();
    if (!item.audio_data) return;
    const audio = new Audio(item.audio_data);
    audio.play();
  };

  const handleDelete = () => {
    setMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
    onDelete(item);
  };

  /* The dropdown menu rendered into document.body via portal — never clipped */
  const dropdownPortal = menuOpen && createPortal(
    <>
      {/* Invisible backdrop to close on outside click */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 9998 }}
        onClick={e => { e.stopPropagation(); setMenuOpen(false); }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: -6 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -6 }}
        transition={{ duration: 0.13 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: menuPos.top,
          right: menuPos.right,
          zIndex: 9999,
          background: 'white',
          minWidth: 155,
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
          border: `1px solid ${pal.bg}`,
          overflow: 'hidden',
        }}
      >
        <button
          onClick={stopProp(() => { setMenuOpen(false); onColorChange(item); })}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-gray-50 transition-colors"
          style={{ color: '#374151', fontFamily: 'Quicksand, sans-serif' }}
        >
          <Palette size={13} /> Couleur
        </button>
        <div style={{ height: 1, background: '#F3F4F6' }} />
        <button
          onClick={stopProp(() => { setMenuOpen(false); onMove(item); })}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-gray-50 transition-colors"
          style={{ color: '#374151', fontFamily: 'Quicksand, sans-serif' }}
        >
          <ArrowRight size={13} /> Déplacer
        </button>
        <div style={{ height: 1, background: '#F3F4F6' }} />
        <button
          onClick={stopProp(handleDelete)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-red-50 transition-colors"
          style={{ color: '#dc2626', fontFamily: 'Quicksand, sans-serif' }}
        >
          <Trash2 size={13} /> Supprimer
        </button>
      </motion.div>
    </>,
    document.body,
  );

  return (
    <>
      <motion.div
        {...lp}
        className="relative rounded-2xl cursor-pointer select-none"
        style={{
          background: cardBg,
          border: cardBorder,
          boxShadow: isDragging
            ? `0 20px 48px rgba(0,0,0,0.18), 0 0 0 3px white`
            : isDarkNote
              ? `0 2px 10px rgba(0,0,0,0.3)`
              : `0 3px 14px ${pal.bg}88`,
          transform: isDragging ? 'scale(1.05) rotate(2deg)' : undefined,
          height: 96,
          display: 'flex',
          flexDirection: 'column',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Header strip */}
        <div
          className="flex items-start justify-between px-3 pt-3 shrink-0"
          style={{ minHeight: 52 }}
        >
          <div className="flex items-start gap-1.5 flex-1 min-w-0 pr-1">
            {type === 'folder' && (
              <Folder size={12} style={{ color: titleColor, opacity: 0.75, marginTop: 2, flexShrink: 0 }} />
            )}
            {type === 'note' && item.type === 'voice' && (
              <Mic size={11} style={{ color: titleColor, opacity: 0.75, marginTop: 2, flexShrink: 0 }} />
            )}
            <p
              className="font-bold text-xs leading-tight line-clamp-3"
              style={{ color: titleColor, fontFamily: '"Quicksand", sans-serif', fontWeight: 700 }}
            >
              {item.title || item.name || 'Sans titre'}
            </p>
          </div>

          {/* Three-dot menu button — ref used to compute portal position */}
          <button
            ref={btnRef}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={stopProp(openMenu)}
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-90 mt-0.5"
            style={{ background: 'rgba(0,0,0,0.10)' }}
          >
            <MoreVertical size={11} style={{ color: titleColor }} />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 pb-2.5 flex-1 items-end">
          {type === 'folder' ? (
            <span className="text-xs opacity-60" style={{ color: titleColor, fontFamily: 'Quicksand, sans-serif' }}>
              {item._noteCount ?? 0} note{(item._noteCount ?? 0) !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs" style={{ color: metaColor, fontFamily: 'Quicksand, sans-serif', fontSize: 10 }}>
              {item.type === 'voice' ? 'Note vocale' : ''}
            </span>
          )}

          <div className="flex items-center gap-1.5">
            {/* Voice play */}
            {type === 'note' && item.type === 'voice' && item.audio_data && (
              <button
                onClick={handlePlayAudio}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                style={{ background: 'rgba(0,0,0,0.12)' }}
              >
                <Play size={10} fill={titleColor} style={{ color: titleColor }} />
              </button>
            )}
            {/* Star */}
            {type === 'note' && (
              <button
                onClick={stopProp(() => onToggleStar(item))}
                className="transition-all hover:scale-110 active:scale-90"
              >
                <Star
                  size={13}
                  fill={item.is_favorite ? titleColor : 'none'}
                  style={{ color: item.is_favorite ? titleColor : metaColor }}
                />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Portal-rendered dropdown — absolute overlay, never clipped */}
      <AnimatePresence>{dropdownPortal}</AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 9999 }}
            onClick={e => { e.stopPropagation(); setShowDeleteConfirm(false); }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <p className="font-bold text-base text-center mb-1" style={{ fontFamily: 'Quicksand, sans-serif', color: '#111827' }}>
                Supprimer ?
              </p>
              <p className="text-sm text-center mb-5" style={{ color: '#6B7280' }}>
                "{item.title || item.name}" sera supprimé définitivement.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={e => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                  className="flex-1 py-2.5 rounded-2xl font-semibold text-sm"
                  style={{ background: '#F3F4F6', color: '#374151', fontFamily: 'Quicksand, sans-serif' }}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-2xl font-semibold text-sm"
                  style={{ background: '#FEE2E2', color: '#dc2626', fontFamily: 'Quicksand, sans-serif' }}
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
