import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import useVisualViewport from '@/hooks/useVisualViewport';
import {
  ChevronLeft, Edit3, Star, ArrowRight, Palette, Eye, Copy, Trash2,
  Play, Pause, Check, Mic, AlertCircle, Loader2, XCircle, Save,
} from 'lucide-react';
import { PALETTE } from '@/lib/constants';
import { NoteDB } from '@/lib/db';
import MarkdownEditor, { renderMarkdown } from './MarkdownEditor';
import TripleWave from './TripleWave';
import ColorPicker from './ColorPicker';
import MoveModal from './MoveModal';
import VoiceRecorder from './VoiceRecorder';

/* Notes longer than this are clipped for rendering — prevents the markdown
   parser from freezing on very large content during every keystroke */
const MAX_RENDER_CHARS = 50_000;

export default function NoteDetail({
  note, folders, dark, onClose, onToggleStar, onDelete, onSave, onColorChange,
}) {
  const [editing, setEditing]               = useState(false);
  const [showPreview, setShowPreview]       = useState(false);
  const [title, setTitle]                   = useState('');
  const [content, setContent]               = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMove, setShowMove]             = useState(false);
  const [showVoice, setShowVoice]           = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playing, setPlaying]               = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [saveState, setSaveState]           = useState('idle'); // idle | saving | saved | error

  const saveStateTimer  = useRef(null);
  const audioRef        = useRef(null);
  const saveTimer       = useRef(null);
  /* isDirtyRef: prevents a pointless DB write on unmount when the user only read the note */
  const isDirtyRef      = useRef(false);
  /* pendingCaretRef: position to restore in the textarea after double-tap-to-edit */
  const pendingCaretRef = useRef(null);
  /* onSaveRef: always points to the latest onSave prop so the debounced timeout
     never captures a stale version after a parent re-render. */
  const onSaveRef       = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  const dragControls    = useDragControls();

  /* Single effect keeps latestRef atomic — avoids the window where one field
     is updated but the others haven't been yet (race on rapid unmount). */
  const latestRef = useRef({ note: null, title: '', content: '' });
  useEffect(() => {
    latestRef.current = { note, title, content };
  }, [note, title, content]);

  /* Flush pending edits to DB on unmount (hardware back-button, etc.)
     Only writes when the user actually typed something (isDirtyRef). */
  useEffect(() => {
    return () => {
      clearTimeout(saveTimer.current);
      clearTimeout(saveStateTimer.current);
      const { note: n, title: t, content: c } = latestRef.current;
      if (n?.id && isDirtyRef.current) {
        NoteDB.update(n.id, { title: t, content: c }).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (note) {
      /* Cancel any in-flight save before resetting state — prevents a pending
         300ms timeout from writing stale content to the newly loaded note. */
      clearTimeout(saveTimer.current);
      clearTimeout(saveStateTimer.current);
      setSaveState('idle');
      setTitle(note.title || '');
      setContent(note.content || '');
      setEditing(false);
      setShowPreview(false);
      setShowColorPicker(false);
      isDirtyRef.current = false;
    }
  }, [note?.id]);

  /* Memoised rendered HTML — only recalculates when content actually changes */
  const renderedHtml = useMemo(() => {
    if (!content) return '';
    const clipped = content.length > MAX_RENDER_CHARS
      ? content.slice(0, MAX_RENDER_CHARS)
      : content;
    const html = renderMarkdown(clipped);
    return content.length > MAX_RENDER_CHARS
      ? html + '<p style="color:#9CA3AF;text-align:center;font-size:11px;margin-top:12px">⚠️ Affichage partiel – note très longue</p>'
      : html;
  }, [content]);

  /* autoSave reads onSave and note from refs so it never captures stale values —
     no dependency array needed, the callback is stable for the component lifetime. */
  const autoSave = useCallback((newTitle, newContent) => {
    clearTimeout(saveTimer.current);
    clearTimeout(saveStateTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(async () => {
      try {
        await onSaveRef.current(latestRef.current.note, { title: newTitle, content: newContent });
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
      saveStateTimer.current = setTimeout(() => setSaveState('idle'), 1500);
    }, 300);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitleChange = (v) => {
    setTitle(v);
    isDirtyRef.current = true;
    autoSave(v, content);
  };
  const handleContentChange = (v) => {
    setContent(v);
    isDirtyRef.current = true;
    autoSave(title, v);
  };

  /* Maps a double-tap on the rendered HTML to the corresponding raw-markdown offset.
     caretRangeFromPoint (Chrome/Safari) / caretPositionFromPoint (Firefox) give us
     the text node + offset at the tap coordinates. We then search for that text
     node's content in the raw markdown to find the closest caret position. */
  const handleDoubleClick = useCallback((e) => {
    if (editing) return;
    let caretOffset = content.length;
    try {
      const range =
        document.caretRangeFromPoint?.(e.clientX, e.clientY) ??
        (() => {
          const pos = document.caretPositionFromPoint?.(e.clientX, e.clientY);
          if (!pos) return null;
          const r = document.createRange();
          r.setStart(pos.offsetNode, pos.offset);
          return r;
        })();
      if (range?.startContainer?.nodeType === Node.TEXT_NODE) {
        const nodeText    = range.startContainer.textContent;
        const offsetInNode = range.startOffset;
        const searchText  = nodeText.trim();
        if (searchText) {
          const idx = content.indexOf(searchText);
          if (idx !== -1) caretOffset = idx + offsetInNode;
        }
      }
    } catch { /* ignore — fall through to end-of-content default */ }
    pendingCaretRef.current = caretOffset;
    setEditing(true);
  }, [editing, content]);

  const handleCopy = () => {
    const text = `${title}\n\n${content}`;
    if (text.length > 10 * 1024 * 1024) {
      setCopied('err');
      setTimeout(() => setCopied(false), 1500);
      return;
    }
    navigator.clipboard?.writeText(text)
      .then(() => { setCopied('ok');  setTimeout(() => setCopied(false), 1500); })
      .catch(() => { setCopied('err'); setTimeout(() => setCopied(false), 1500); });
  };

  /* Discard the cached Audio object whenever the recording changes so the next
     play() uses the new data URL — avoids playing a stale/deleted recording. */
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
    }
  }, [note?.audio_data]);

  const togglePlay = () => {
    if (!note?.audio_data) return;
    if (!audioRef.current) {
      const audio = new Audio(note.audio_data);
      /* onended set once at creation — property assignment, not addEventListener,
         so there is no accumulation, but binding here makes the intent explicit. */
      audio.onended = () => setPlaying(false);
      audioRef.current = audio;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const handleSaveVoice = (audioData) => {
    onSave(note, { audio_data: audioData });
  };

  const vpHeight = useVisualViewport();

  if (!note) return null;
  const pal    = PALETTE.find(p => p.bg === note.color) || PALETTE[8];
  const pageBg = dark ? '#1a1a2e' : '#FAFAFA';
  const textFg = dark ? '#f0f0f0' : '#374151';

  const IconBtn = ({ onClick, children, active, ariaLabel }) => (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active ?? undefined}
      className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-90 shrink-0"
      style={{ background: active ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.14)' }}
    >
      {children}
    </button>
  );

  /* ── Save status indicator ────────────────────────────────────────────────
     Sits between the back arrow and the edit pencil. Same w-9 h-9 dimensions
     as IconBtn so the top bar stays perfectly aligned at all times.
     Non-interactive (div, not button) — aria-live announces state changes.  */
  const SaveIndicator = (
    <div
      className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
      style={{ background: 'rgba(0,0,0,0.14)' }}
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        {saveState === 'saving' && (
          <motion.div
            key="saving"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 size={15} style={{ color: pal.fg }} />
            </motion.div>
          </motion.div>
        )}
        {saveState === 'saved' && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
          >
            <Check size={15} style={{ color: pal.fg }} />
          </motion.div>
        )}
        {saveState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
          >
            <XCircle size={15} style={{ color: '#ef4444' }} />
          </motion.div>
        )}
        {saveState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Save size={15} style={{ color: pal.fg, opacity: 0.28 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 0.4 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 120) {
          clearTimeout(saveTimer.current);
          onSave(note, { title, content });
          onClose();
        }
      }}
      className="fixed z-40 flex flex-col"
      style={{ top: 0, left: 0, right: 0, height: vpHeight, background: pageBg }}
    >
      {/* Colored wave header — drag-to-close starts here only */}
      <div
        className="relative shrink-0"
        style={{ background: note.color, minHeight: 110, touchAction: 'none' }}
        onPointerDown={e => dragControls.start(e)}
      >
        {/* Drag handle pill */}
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
          style={{ background: `${pal.fg}40` }}
          aria-hidden="true"
        />

        {/* Top bar ─ left: [back][save-indicator]  right: [all action icons] */}
        <div
          className="flex items-center justify-between px-4 pb-1 relative z-10 gap-1"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >
          {/* Left group */}
          <div className="flex items-center gap-1">
            <IconBtn
              onClick={() => {
                clearTimeout(saveTimer.current);
                onSave(note, { title, content });
                onClose();
              }}
              ariaLabel="Retour"
            >
              <ChevronLeft size={18} style={{ color: pal.fg }} />
            </IconBtn>

            {SaveIndicator}
          </div>

          {/* Right group */}
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <IconBtn
              onClick={() => setEditing(v => !v)}
              active={editing}
              ariaLabel={editing ? 'Quitter l\'édition' : 'Modifier la note'}
            >
              <Edit3 size={15} style={{ color: pal.fg }} />
            </IconBtn>
            <IconBtn
              onClick={() => onToggleStar(note)}
              ariaLabel={note.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Star size={15} fill={note.is_favorite ? pal.fg : 'none'} style={{ color: pal.fg }} />
            </IconBtn>
            <IconBtn onClick={() => setShowMove(true)} ariaLabel="Déplacer la note">
              <ArrowRight size={15} style={{ color: pal.fg }} />
            </IconBtn>
            <IconBtn
              onClick={() => setShowColorPicker(v => !v)}
              active={showColorPicker}
              ariaLabel="Changer la couleur"
            >
              <Palette size={15} style={{ color: pal.fg }} />
            </IconBtn>
            {editing && (
              <IconBtn
                onClick={() => setShowPreview(v => !v)}
                active={showPreview}
                ariaLabel={showPreview ? 'Masquer la prévisualisation' : 'Prévisualiser'}
              >
                <Eye size={15} style={{ color: pal.fg }} />
              </IconBtn>
            )}
            <IconBtn
              onClick={handleCopy}
              ariaLabel={copied === 'err' ? 'Erreur : impossible de copier' : copied ? 'Copié !' : 'Copier la note'}
            >
              {copied === 'err'
                ? <AlertCircle size={15} style={{ color: pal.fg }} />
                : copied
                  ? <Check size={15} style={{ color: pal.fg }} />
                  : <Copy size={15} style={{ color: pal.fg }} />
              }
            </IconBtn>
            {note.type === 'voice' && (
              <IconBtn
                onClick={togglePlay}
                active={playing}
                ariaLabel={playing ? 'Mettre en pause' : 'Écouter la note vocale'}
              >
                {playing
                  ? <Pause size={15} style={{ color: pal.fg }} />
                  : <Play  size={15} style={{ color: pal.fg }} />}
              </IconBtn>
            )}
            {note.type === 'voice' && (
              <IconBtn onClick={() => setShowVoice(true)} ariaLabel="Ré-enregistrer la note vocale">
                <Mic size={15} style={{ color: pal.fg }} />
              </IconBtn>
            )}
            <IconBtn onClick={() => setShowDeleteConfirm(true)} ariaLabel="Supprimer la note">
              <Trash2 size={15} style={{ color: pal.fg }} />
            </IconBtn>
          </div>
        </div>

        {/* Title */}
        <div className="px-5 pb-9 pt-1 relative z-10">
          {editing ? (
            <>
              <label className="sr-only" htmlFor="note-title-input">Titre de la note</label>
              <input
                id="note-title-input"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                className="w-full bg-transparent outline-none border-b text-lg font-bold"
                style={{
                  color: pal.fg,
                  borderColor: `${pal.fg}40`,
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                }}
              />
            </>
          ) : (
            <h2
              className="text-lg font-bold leading-snug"
              style={{ color: pal.fg, fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}
            >
              {note.title || 'Sans titre'}
            </h2>
          )}
        </div>

        <TripleWave color={pageBg} />
      </div>

      {/* Color picker panel */}
      <AnimatePresence>
        {showColorPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 overflow-hidden"
            style={{
              background: dark ? '#2d2d4a' : '#F9FAFB',
              borderBottom: `1px solid ${dark ? '#3d3d5a' : '#F3F4F6'}`,
            }}
          >
            <div className="px-5 py-4">
              <ColorPicker
                value={note.color}
                onChange={c => { onColorChange(note, c); setShowColorPicker(false); }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area — double-tap enters edit mode at the tapped position */}
      <div
        className="flex-1 overflow-y-auto relative"
        style={{ touchAction: 'manipulation' }}
        onPointerDown={e => e.stopPropagation()}
        onDoubleClick={!editing ? handleDoubleClick : undefined}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(180,180,120,0.3) 1.2px, transparent 1.2px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div
          className="relative z-10 px-5 py-4 pb-4 min-h-full flex flex-col"
          style={{ touchAction: 'auto' }}
        >
          {editing ? (
            showPreview ? (
              <div
                role="article"
                aria-label={`Prévisualisation : ${title || 'Sans titre'}`}
                className="text-sm leading-relaxed"
                style={{ color: textFg, fontFamily: 'Quicksand, sans-serif' }}
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            ) : (
              <MarkdownEditor value={content} onChange={handleContentChange} fg={textFg} initialCaretOffset={pendingCaretRef.current} />
            )
          ) : (
            content ? (
              <>
                <div
                  role="article"
                  aria-label={title || 'Sans titre'}
                  className="text-sm leading-relaxed"
                  style={{ color: textFg, fontFamily: 'Quicksand, sans-serif' }}
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
                <p
                  className="text-xs text-center mt-6 select-none"
                  style={{ color: textFg, opacity: 0.25, fontFamily: 'Quicksand, sans-serif' }}
                >
                  ✏️ double appui pour modifier
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}>
                Note vide — double appui pour commencer à écrire.
              </p>
            )
          )}
        </div>
      </div>

      {/* Move modal */}
      <MoveModal
        show={showMove}
        item={note}
        folders={folders}
        onClose={() => setShowMove(false)}
        onMove={(item, folder) => {
          onSave(note, { folder_id: folder?.id ?? null });
          setShowMove(false);
        }}
      />

      {/* Voice recorder */}
      <VoiceRecorder
        show={showVoice}
        note={note}
        color={note.color}
        onSave={handleSaveVoice}
        onClose={() => setShowVoice(false)}
      />

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Confirmer la suppression"
          >
            <motion.div
              initial={{ scale: 0.88 }}
              animate={{ scale: 1 }}
              className="rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center"
              style={{ background: dark ? '#2d2d4a' : 'white' }}
            >
              <p
                className="font-bold text-base mb-1"
                style={{ fontFamily: 'Quicksand, sans-serif', color: dark ? '#f0f0f0' : '#111827' }}
              >
                Supprimer ?
              </p>
              <p className="text-sm mb-5" style={{ color: dark ? '#9CA3AF' : '#6B7280' }}>
                "{note.title}" sera supprimé définitivement.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-2xl font-semibold text-sm"
                  style={{
                    background: dark ? '#374151' : '#F3F4F6',
                    color: dark ? '#f0f0f0' : '#374151',
                    fontFamily: 'Quicksand, sans-serif',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => { onDelete(note); onClose(); }}
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
    </motion.div>
  );
}
