import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  ChevronLeft, Edit3, Star, ArrowRight, Palette, Eye, Copy, Trash2,
  Play, Pause, Check, Mic,
} from 'lucide-react';
import { PALETTE } from '@/lib/constants';
import MarkdownEditor, { renderMarkdown } from './MarkdownEditor';
import TripleWave from './TripleWave';
import ColorPicker from './ColorPicker';
import MoveModal from './MoveModal';
import VoiceRecorder from './VoiceRecorder';

export default function NoteDetail({
  note, folders, onClose, onToggleStar, onDelete, onSave, onColorChange,
}) {
  const [editing, setEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef    = useRef(null);
  const saveTimer   = useRef(null);
  const dragControls = useDragControls();

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setEditing(false);
      setShowPreview(false);
      setShowColorPicker(false);
    }
  }, [note?.id]);

  /* Auto-save while editing */
  const autoSave = useCallback((newTitle, newContent) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave(note, { title: newTitle, content: newContent });
    }, 800);
  }, [note, onSave]);

  const handleTitleChange = (v) => { setTitle(v); autoSave(v, content); };
  const handleContentChange = (v) => { setContent(v); autoSave(title, v); };

  const handleCopy = () => {
    navigator.clipboard?.writeText(`${title}\n\n${content}`).catch(() => {});
  };

  const togglePlay = () => {
    if (!note?.audio_data) return;
    if (!audioRef.current) audioRef.current = new Audio(note.audio_data);
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else {
      audioRef.current.play();
      setPlaying(true);
      audioRef.current.onended = () => setPlaying(false);
    }
  };

  const handleSaveVoice = (audioData) => {
    onSave(note, { audio_data: audioData });
  };

  if (!note) return null;
  const pal = PALETTE.find(p => p.bg === note.color) || PALETTE[8];

  const IconBtn = ({ onClick, children, active }) => (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-90 shrink-0"
      style={{ background: active ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.10)' }}
    >
      {children}
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div
        key="note-detail"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_, info) => { if (info.offset.y > 120) { clearTimeout(saveTimer.current); onSave(note, { title, content }); onClose(); } }}
        className="fixed inset-0 z-40 flex flex-col"
        style={{ background: '#FAFAFA' }}
      >
        {/* Colored wave header — drag-to-close starts here only */}
        <div
          className="relative shrink-0"
          style={{ background: note.color, minHeight: 110, touchAction: 'none' }}
          onPointerDown={e => dragControls.start(e)}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-1 relative z-10 gap-1">
            <IconBtn onClick={() => { clearTimeout(saveTimer.current); onSave(note, { title, content }); onClose(); }}>
              <ChevronLeft size={18} style={{ color: pal.fg }} />
            </IconBtn>

            <div className="flex items-center gap-1 flex-wrap justify-end">
              <IconBtn onClick={() => setEditing(v => !v)} active={editing}>
                <Edit3 size={15} style={{ color: pal.fg }} />
              </IconBtn>
              <IconBtn onClick={() => onToggleStar(note)}>
                <Star size={15} fill={note.is_favorite ? pal.fg : 'none'} style={{ color: pal.fg }} />
              </IconBtn>
              <IconBtn onClick={() => setShowMove(true)}>
                <ArrowRight size={15} style={{ color: pal.fg }} />
              </IconBtn>
              <IconBtn onClick={() => setShowColorPicker(v => !v)} active={showColorPicker}>
                <Palette size={15} style={{ color: pal.fg }} />
              </IconBtn>
              {editing && (
                <IconBtn onClick={() => setShowPreview(v => !v)} active={showPreview}>
                  <Eye size={15} style={{ color: pal.fg }} />
                </IconBtn>
              )}
              <IconBtn onClick={handleCopy}>
                <Copy size={15} style={{ color: pal.fg }} />
              </IconBtn>
              {note.type === 'voice' && (
                <IconBtn onClick={togglePlay} active={playing}>
                  {playing ? <Pause size={15} style={{ color: pal.fg }} /> : <Play size={15} style={{ color: pal.fg }} />}
                </IconBtn>
              )}
              {note.type === 'voice' && (
                <IconBtn onClick={() => setShowVoice(true)}>
                  <Mic size={15} style={{ color: pal.fg }} />
                </IconBtn>
              )}
              <IconBtn onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={15} style={{ color: pal.fg }} />
              </IconBtn>
            </div>
          </div>

          {/* Title */}
          <div className="px-5 pb-9 pt-1 relative z-10">
            {editing ? (
              <input
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                className="w-full bg-transparent outline-none border-b text-lg font-bold"
                style={{ color: pal.fg, borderColor: `${pal.fg}40`, fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}
              />
            ) : (
              <h2 className="text-lg font-bold leading-snug" style={{ color: pal.fg, fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                {note.title || 'Sans titre'}
              </h2>
            )}
          </div>

          <TripleWave color="#FAFAFA" />
        </div>

        {/* Color picker panel */}
        <AnimatePresence>
          {showColorPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden"
              style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}
            >
              <div className="px-5 py-4">
                <ColorPicker value={note.color} onChange={c => { onColorChange(note, c); setShowColorPicker(false); }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dot-grid background + content */}
        <div
          className="flex-1 overflow-y-auto relative"
          style={{ touchAction: 'auto' }}
          onPointerDown={e => e.stopPropagation()}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(180,180,120,0.3) 1.2px, transparent 1.2px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div className="relative z-10 px-5 py-4 pb-16 min-h-full" style={{ touchAction: 'auto' }}>
            {editing ? (
              showPreview ? (
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: '#374151', fontFamily: 'Quicksand, sans-serif' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              ) : (
                <MarkdownEditor value={content} onChange={handleContentChange} fg="#374151" />
              )
            ) : (
              content ? (
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: '#374151', fontFamily: 'Quicksand, sans-serif' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              ) : (
                <p className="text-sm" style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}>
                  Note vide. Appuie sur ✏️ pour commencer à écrire.
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
          onMove={(item, folder) => { onSave(note, { folder_id: folder?.id ?? null }); setShowMove(false); }}
        />

        {/* Voice recorder */}
        <VoiceRecorder
          show={showVoice}
          note={note}
          color={note.color}
          onSave={handleSaveVoice}
          onClose={() => setShowVoice(false)}
        />

        {/* Delete confirm */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center px-6"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              <motion.div
                initial={{ scale: 0.88 }}
                animate={{ scale: 1 }}
                className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center"
              >
                <p className="font-bold text-base mb-1" style={{ fontFamily: 'Quicksand, sans-serif', color: '#111827' }}>Supprimer ?</p>
                <p className="text-sm mb-5" style={{ color: '#6B7280' }}>"{note.title}" sera supprimé définitivement.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-2xl font-semibold text-sm" style={{ background: '#F3F4F6', color: '#374151' }}>Annuler</button>
                  <button onClick={() => { onDelete(note); onClose(); }} className="flex-1 py-2.5 rounded-2xl font-semibold text-sm" style={{ background: '#FEE2E2', color: '#dc2626' }}>Supprimer</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
