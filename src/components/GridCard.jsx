import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Star, Trash2, Palette, Play, Mic } from 'lucide-react';
import { PALETTE } from '@/lib/constants';

export default function GridCard({
  item, type, onOpen, onToggleStar, onDelete, onColorChange, isDragging, dark,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /* Palette — in dark mode notes blend with the page background */
  const pal        = PALETTE.find(p => p.bg === item.color) || PALETTE[8];
  const isDarkNote = dark && type === 'note';
  const cardBg     = isDarkNote ? '#1a1a2e' : pal.bg;
  const titleColor = isDarkNote ? pal.bg    : pal.fg;
  const metaColor  = isDarkNote ? `${pal.bg}99` : `${pal.fg}99`;
  const cardBorder = isDarkNote ? `1px solid ${pal.bg}40` : 'none';

  const stopProp = fn => e => { e.stopPropagation(); fn(e); };

  const handlePlayAudio = (e) => {
    e.stopPropagation();
    if (!item.audio_data) return;
    const audio = new Audio(item.audio_data);
    audio.play();
  };

  const confirmDelete = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
    onDelete(item);
  };

  return (
    <>
      <motion.div
        onClick={() => onOpen(item)}
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
          {/* Icon + title */}
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

          {/* Action icons: palette + delete
              onMouseDown/onTouchStart stop propagation so DnD never fires from these */}
          <div
            className="flex items-center gap-1 shrink-0"
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
          >
            <button
              onClick={stopProp(() => onColorChange(item))}
              className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:scale-110 active:scale-90"
              style={{ background: 'rgba(0,0,0,0.09)' }}
              aria-label="Changer la couleur"
            >
              <Palette size={10} style={{ color: titleColor }} />
            </button>
            <button
              onClick={stopProp(() => setShowDeleteConfirm(true))}
              className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:scale-110 active:scale-90"
              style={{ background: 'rgba(0,0,0,0.09)' }}
              aria-label="Supprimer"
            >
              <Trash2 size={10} style={{ color: titleColor }} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between px-3 pb-2.5 flex-1">
          {type === 'folder' ? (
            <span className="text-xs opacity-60 leading-tight" style={{ color: titleColor, fontFamily: 'Quicksand, sans-serif' }}>
              {item._noteCount ?? 0} note{(item._noteCount ?? 0) !== 1 ? 's' : ''}
              {(item._folderCount ?? 0) > 0 && (
                <> · {item._folderCount} dossier{item._folderCount !== 1 ? 's' : ''}</>
              )}
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
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
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
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
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

      {/* Delete confirmation — AnimatePresence lives INSIDE the portal
          so Framer Motion can track the DOM node it actually controls */}
      {createPortal(
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              key="delete-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center px-6"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 9999 }}
              onClick={e => { e.stopPropagation(); setShowDeleteConfirm(false); }}
            >
              <motion.div
                key="delete-card"
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1,    opacity: 1 }}
                exit={{ scale: 0.88,    opacity: 0 }}
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
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
