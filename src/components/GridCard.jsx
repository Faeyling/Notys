import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Star, Trash2, Palette, Play, Mic, Edit2 } from 'lucide-react';
import { PALETTE } from '@/lib/constants';

/* Module-level singleton: only one audio plays at a time across all cards */
let _activeAudio = null;

export default function GridCard({
  item, type, onOpen, onToggleStar, onDelete, onColorChange, onRename, isDragging, dark,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renaming, setRenaming]   = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [playFailed, setPlayFailed] = useState(false);
  const renameRef  = useRef(null);
  /* Tracks the Audio instance started by THIS card so we can stop it on unmount */
  const myAudioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (myAudioRef.current) {
        myAudioRef.current.pause();
        if (_activeAudio === myAudioRef.current) _activeAudio = null;
        myAudioRef.current = null;
      }
    };
  }, []);

  /* Palette — in dark mode notes blend with the page background */
  const pal        = PALETTE.find(p => p.bg === item.color) || PALETTE[8];
  const isDarkNote = dark && type === 'note';
  const cardBg     = isDarkNote ? '#1a1a2e' : pal.bg;
  const titleColor = isDarkNote ? pal.bg    : pal.fg;
  const metaColor  = isDarkNote ? `${pal.bg}99` : `${pal.fg}99`;
  const cardBorder = isDarkNote ? `1px solid ${pal.bg}40` : 'none';

  const stopProp = fn => e => { e.stopPropagation(); fn(e); };

  const startRename = (e) => {
    e.stopPropagation();
    setRenameVal(item.name || item.title || '');
    setRenaming(true);
  };

  const commitRename = async () => {
    const trimmed = renameVal.trim();
    if (!trimmed || trimmed === (item.name || item.title)) { setRenaming(false); return; }
    try { await onRename?.(item, trimmed); } finally { setRenaming(false); }
  };

  /* Focus the input as soon as it mounts */
  useEffect(() => {
    if (renaming) renameRef.current?.select();
  }, [renaming]);

  const handlePlayAudio = (e) => {
    e.stopPropagation();
    if (!item.audio_data) return;
    /* Reject malformed data URIs before handing to the Audio constructor */
    if (
      typeof item.audio_data !== 'string' ||
      !item.audio_data.startsWith('data:audio/')
    ) return;
    /* Stop any previously playing card audio */
    if (_activeAudio) {
      try { _activeAudio.pause(); _activeAudio.currentTime = 0; } catch { /* already GC'd */ }
      _activeAudio = null;
    }
    /* Reuse existing instance to avoid re-allocating the full dataURI in RAM */
    if (!myAudioRef.current) {
      myAudioRef.current = new Audio(item.audio_data);
      myAudioRef.current.onended = () => {
        _activeAudio = null;
        myAudioRef.current = null;
      };
    }
    _activeAudio = myAudioRef.current;
    myAudioRef.current.play().catch(() => {
      _activeAudio = null;
      myAudioRef.current = null;
      setPlayFailed(true);
      setTimeout(() => setPlayFailed(false), 2000);
    });
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
        whileHover={isDragging ? {} : { scale: 1.02 }}
        whileTap={isDragging ? {} : { scale: 0.97 }}
      >
        {/* Header strip */}
        <div
          className="flex items-start justify-between px-3 pt-3 shrink-0"
          style={{ minHeight: 52 }}
        >
          {/* Icon + title (or rename input for folders) */}
          <div className="flex items-start gap-1.5 flex-1 min-w-0 pr-1">
            {type === 'folder' && !renaming && (
              <Folder size={12} style={{ color: titleColor, opacity: 0.75, marginTop: 2, flexShrink: 0 }} />
            )}
            {type === 'note' && item.type === 'voice' && (
              <Mic size={14} style={{ color: titleColor, opacity: 0.75, marginTop: 2, flexShrink: 0 }} />
            )}
            {renaming ? (
              <input
                ref={renameRef}
                placeholder={item.name || item.title || 'Nouveau nom'}
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter')  { e.preventDefault(); commitRename(); }
                  if (e.key === 'Escape') { e.preventDefault(); setRenaming(false); }
                  e.stopPropagation();
                }}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                className="w-full bg-transparent outline-none border-b font-bold text-xs leading-tight"
                style={{ color: titleColor, borderColor: `${titleColor}60`, fontFamily: '"Quicksand", sans-serif' }}
              />
            ) : (
              <p
                className="font-bold text-xs leading-tight line-clamp-3"
                title={item.title || item.name || 'Sans titre'}
                style={{ color: titleColor, fontFamily: '"Quicksand", sans-serif', fontWeight: 700 }}
              >
                {item.title || item.name || 'Sans titre'}
              </p>
            )}
          </div>

          {/* Action icons — onMouseDown/onTouchStart stop propagation so DnD never fires */}
          <div
            className="flex items-center gap-1 shrink-0"
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
          >
            <button
              onClick={stopProp(() => onColorChange(item))}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-all hover:scale-110 active:scale-90"
              style={{ background: 'rgba(0,0,0,0.09)' }}
              aria-label="Changer la couleur"
            >
              <Palette size={11} style={{ color: titleColor }} />
            </button>
            {/* Rename — folders only */}
            {type === 'folder' && (
              <button
                onClick={startRename}
                className="w-8 h-8 rounded-md flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                style={{ background: renaming ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.09)' }}
                aria-label="Renommer"
              >
                <Edit2 size={11} style={{ color: titleColor }} />
              </button>
            )}
            <button
              onClick={stopProp(() => setShowDeleteConfirm(true))}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-all hover:scale-110 active:scale-90"
              style={{ background: 'rgba(0,0,0,0.09)' }}
              aria-label="Supprimer"
            >
              <Trash2 size={11} style={{ color: titleColor }} />
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
                aria-label={playFailed ? 'Lecture impossible' : 'Écouter la note vocale'}
                title={playFailed ? 'Lecture impossible' : undefined}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                style={{ background: playFailed ? 'rgba(220,38,38,0.18)' : 'rgba(0,0,0,0.12)' }}
              >
                {playFailed
                  ? <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626' }}>✕</span>
                  : <Play size={10} fill={titleColor} style={{ color: titleColor }} />}
              </button>
            )}
            {/* Star */}
            {type === 'note' && (
              <button
                onClick={stopProp(() => onToggleStar(item))}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
                aria-label={item.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                aria-pressed={item.is_favorite}
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
              role="dialog"
              aria-modal="true"
              aria-label="Confirmer la suppression"
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
                  {type === 'folder' && (item._noteCount ?? 0) > 0 && (
                    <><br /><span style={{ color: '#ef4444', fontSize: 12 }}>
                      ⚠️ Les {item._noteCount} note{item._noteCount > 1 ? 's' : ''} qu'il contient seront déplacées à la racine.
                    </span></>
                  )}
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
