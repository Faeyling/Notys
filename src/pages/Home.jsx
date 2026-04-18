import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Home as HomeIcon, Star, Search, HardDrive,
  HelpCircle, Moon, Sun, SlidersHorizontal, Folder, FileText, Mic,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { NoteDB, FolderDB, sortItems } from '@/lib/db';
import { PALETTE, DEFAULT_COLOR, PAGE_WAVE_COLORS } from '@/lib/constants';
import DotGrid from '@/components/DotGrid';
import TripleWave from '@/components/TripleWave';
import GridCard from '@/components/GridCard';
import CreateModal from '@/components/CreateModal';
import NoteDetail from '@/components/NoteDetail';
import FolderLayer from '@/components/FolderLayer';
import MoveModal from '@/components/MoveModal';
import ColorChangeModal from '@/components/ColorChangeModal';
import HelpModal from '@/components/HelpModal';
import SortMenu from '@/components/SortMenu';
import BackupReminderModal from '@/components/BackupReminderModal';
import VoiceRecorder from '@/components/VoiceRecorder';
import Mascot from '@/components/Mascot';
import useOrientation from '@/hooks/useOrientation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

/* ── Sunday backup check ──────────────────────────────── */
function shouldShowBackupReminder() {
  if (new Date().getDay() !== 0) return false;
  const key = 'notys-backup-reminder-week';
  const week = `${new Date().getFullYear()}-W${Math.ceil(new Date().getDate() / 7)}`;
  if (localStorage.getItem(key) === week) return false;
  localStorage.setItem(key, week);
  return true;
}

/* ── Empty-state mascots ──────────────────────────────── */
function EmptyState({ tab, hasQuery, animated }) {
  const states = {
    home:   { variant: 'spa',     title: 'Le carnet est tout propre !',    sub: 'Noty attend ta première idée pour la colorier.' },
    fav:    { variant: 'float',   title: 'Rien à l\'horizon.',             sub: 'Mets une ⭐ sur tes notes les plus importantes pour les voir flotter ici.' },
    search: { variant: 'snorkel', title: hasQuery ? 'Je cherche encore…' : 'Explore tes notes !', sub: hasQuery ? 'Noty ne trouve rien. Vérifie l\'orthographe !' : 'Tape pour chercher parmi toutes tes notes.' },
  };
  const s = states[tab] || states.home;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-14 gap-4"
    >
      <Mascot variant={s.variant} size={110} animate={animated} />
      <p className="font-bold text-base text-center" style={{ fontFamily: 'Quicksand, sans-serif', color: '#111827' }}>{s.title}</p>
      <p className="text-sm text-center max-w-xs" style={{ fontFamily: 'Quicksand, sans-serif', color: '#9CA3AF' }}>{s.sub}</p>
    </motion.div>
  );
}

/* ── Unified grid with DnD ──────────────────────────── */
function ItemGrid({ items, folders, onOpenNote, onOpenFolder, onToggleStar, onDelete, onColorChange, onDragEnd, dark }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="main-grid" direction="horizontal">
        {(prov) => (
          <div
            ref={prov.innerRef}
            {...prov.droppableProps}
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
          >
            {items.map((item, idx) => {
              const isFolder = item._type === 'folder';
              const dId = `${isFolder ? 'f' : 'n'}-${item.id}`;
              return (
                <Draggable key={dId} draggableId={dId} index={idx}>
                  {(p, s) => (
                    <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}>
                      {isFolder ? (
                        <Droppable droppableId={`folder-drop-${item.id}`}>
                          {(fp, fs) => (
                            <div
                              ref={fp.innerRef}
                              {...fp.droppableProps}
                              style={{
                                borderRadius: 16,
                                outline: fs.isDraggingOver ? `2.5px dashed ${item.color}` : '2.5px dashed transparent',
                                transition: 'outline 0.15s',
                              }}
                            >
                              <GridCard
                                item={{ ...item, _noteCount: folders?.find(f => f.id === item.id)?._noteCount ?? 0 }}
                                type="folder"
                                onOpen={() => onOpenFolder(item)}
                                onToggleStar={() => {}}
                                onDelete={onDelete}
                                onColorChange={onColorChange}
                                isDragging={s.isDragging}
                                dark={dark}
                              />
                              {fp.placeholder}
                            </div>
                          )}
                        </Droppable>
                      ) : (
                        <GridCard
                          item={item}
                          type="note"
                          onOpen={onOpenNote}
                          onToggleStar={onToggleStar}
                          onDelete={onDelete}
                          onColorChange={onColorChange}
                          isDragging={s.isDragging}
                          dark={dark}
                        />
                      )}
                    </div>
                  )}
                </Draggable>
              );
            })}
            {prov.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

/* ── Main App ─────────────────────────────────────────── */
export default function Home({ onGoBackup, dark, setDark, animated }) {
  const landscape = useOrientation();

  const [tab, setTab]           = useState('home');
  const [notes, setNotes]       = useState([]);
  const [folders, setFolders]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sortId, setSortId]     = useState(() => localStorage.getItem('notys-sort') || 'date_desc');
  const [showSort, setShowSort] = useState(false);
  const [searchQ, setSearchQ]   = useState('');

  const [showCreate, setShowCreate]       = useState(false);
  const [createType, setCreateType]       = useState('note');
  const [openNote, setOpenNote]           = useState(null);
  const [openFolder, setOpenFolder]       = useState(null);
  const [moveTarget, setMoveTarget]       = useState(null);
  const [colorTarget, setColorTarget]     = useState(null);
  const [voiceTarget, setVoiceTarget]     = useState(null);
  const [showHelp, setShowHelp]           = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [showFab, setShowFab]             = useState(false);

  const scrollRef   = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [wiggle, setWiggle]     = useState(false);
  const wiggleTimer             = useRef(null);

  /* Load data */
  useEffect(() => {
    Promise.all([NoteDB.list(), FolderDB.list()])
      .then(([n, f]) => { setNotes(n); setFolders(f); })
      .finally(() => setLoading(false));
    setTimeout(() => { if (shouldShowBackupReminder()) setShowBackupReminder(true); }, 2000);
  }, []);

  /* Sort persistence */
  useEffect(() => { localStorage.setItem('notys-sort', sortId); }, [sortId]);

  /* Sync browser/OS status-bar color with the active tab wave color */
  useEffect(() => {
    const color = PAGE_WAVE_COLORS[tab] || PAGE_WAVE_COLORS.home;
    const meta  = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color);
  }, [tab]);

  /* Scroll handler */
  const onScroll = useCallback((e) => {
    const y = e.currentTarget.scrollTop;
    setScrolled(y > 40);
    setWiggle(true);
    clearTimeout(wiggleTimer.current);
    wiggleTimer.current = setTimeout(() => setWiggle(false), 400);
  }, []);

  /* Note count + sub-folder count per folder */
  const foldersWithCount = folders.map(f => ({
    ...f,
    _noteCount:   notes.filter(n => n.folder_id === f.id).length,
    _folderCount: folders.filter(sf => sf.parent_id === f.id).length,
    _type: 'folder',
  }));

  /* Derived views */
  const rootNotes   = notes.filter(n => !n.folder_id);
  const rootFolders = foldersWithCount.filter(f => !f.parent_id);
  const homeItems   = sortItems(
    [...rootFolders, ...rootNotes.map(n => ({ ...n, _type: 'note' }))],
    sortId,
  );
  const favNotes = sortItems(
    notes.filter(n => n.is_favorite).map(n => ({ ...n, _type: 'note' })),
    sortId,
  );
  const searchResults = (() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return [
      /* Folders matching by name */
      ...foldersWithCount.filter(f => f.name?.toLowerCase().includes(q)),
      /* Notes matching by title or content */
      ...notes
        .filter(n =>
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q)
        )
        .map(n => ({ ...n, _type: 'note' })),
    ];
  })();

  /* Folder layer items */
  const folderNotes = openFolder
    ? notes.filter(n => n.folder_id === openFolder.id).map(n => ({ ...n, _type: 'note' }))
    : [];
  const subFolders = openFolder
    ? foldersWithCount.filter(f => f.parent_id === openFolder.id)
    : [];
  const folderItems = sortItems([...subFolders, ...folderNotes], sortId);

  /* ── Actions ── */
  const handleSave = async (data) => {
    if (data.type === 'folder') {
      const payload = { name: data.title, color: data.color, parent_id: openFolder?.id || null };
      const f = await FolderDB.create(payload);
      setFolders(prev => [f, ...prev]);
    } else {
      const folderColor = data.folder_id
        ? folders.find(f => f.id === Number(data.folder_id))?.color
        : null;
      const payload = {
        title: data.title, content: data.content,
        color: folderColor || data.color,
        is_favorite: false,
        folder_id: data.folder_id ? Number(data.folder_id) : (openFolder?.id || null),
        type: data.type === 'voice' ? 'voice' : 'note',
      };
      const n = await NoteDB.create(payload);
      setNotes(prev => [n, ...prev]);
      if (data.type === 'voice') setVoiceTarget(n);
    }
  };

  const handleToggleStar = async (note) => {
    const updated = { ...note, is_favorite: !note.is_favorite };
    setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
    if (openNote?.id === note.id) setOpenNote(updated);
    await NoteDB.update(note.id, { is_favorite: updated.is_favorite });
  };

  const handleSaveNote = async (note, changes) => {
    const updated = { ...note, ...changes };
    setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
    if (openNote?.id === note.id) setOpenNote(updated);
    await NoteDB.update(note.id, changes);
  };

  const handleDelete = async (item) => {
    const isFolder = item._type === 'folder';
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 }, colors: [item.color, '#fff', '#ffc7ee'] });
    if (isFolder) {
      setFolders(prev => prev.filter(f => f.id !== item.id));
      await FolderDB.delete(item.id);
      const orphans = notes.filter(n => n.folder_id === item.id);
      for (const n of orphans) await NoteDB.update(n.id, { folder_id: null });
      setNotes(prev => prev.map(n => n.folder_id === item.id ? { ...n, folder_id: null } : n));
    } else {
      setNotes(prev => prev.filter(n => n.id !== item.id));
      await NoteDB.delete(item.id);
    }
    if (openNote?.id === item.id) setOpenNote(null);
  };

  const handleMove = async (item, targetFolder) => {
    const isFolder = item._type === 'folder';
    const newId = targetFolder?.id ?? null;
    if (isFolder) {
      setFolders(prev => prev.map(f => f.id === item.id ? { ...f, parent_id: newId } : f));
      await FolderDB.update(item.id, { parent_id: newId });
    } else {
      const folderColor = targetFolder?.color;
      const updated = { ...item, folder_id: newId, ...(folderColor ? { color: folderColor } : {}) };
      setNotes(prev => prev.map(n => n.id === item.id ? updated : n));
      if (openNote?.id === item.id) setOpenNote(updated);
      await NoteDB.update(item.id, { folder_id: newId, ...(folderColor ? { color: folderColor } : {}) });
    }
  };

  /**
   * handleColorChange — persists the new color to DB immediately.
   * Called from ColorChangeModal (item, color) or NoteDetail.
   */
  const handleColorChange = async (item, color) => {
    const isFolder = item._type === 'folder';
    if (isFolder) {
      setFolders(prev => prev.map(f => f.id === item.id ? { ...f, color } : f));
      await FolderDB.update(item.id, { color });
    } else {
      const updated = { ...item, color };
      setNotes(prev => prev.map(n => n.id === item.id ? updated : n));
      if (openNote?.id === item.id) setOpenNote(updated);
      await NoteDB.update(item.id, { color });
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    /* Dropped INTO a folder → move item */
    if (destination.droppableId.startsWith('folder-drop-')) {
      const folderId = Number(destination.droppableId.replace('folder-drop-', ''));
      const targetFolder = folders.find(f => f.id === folderId);
      if (!targetFolder) return;
      const isNote = draggableId.startsWith('n-');
      const itemId = Number(draggableId.slice(2));
      if (isNote) {
        const note = notes.find(n => n.id === itemId);
        if (note) handleMove({ ...note, _type: 'note' }, targetFolder);
      }
      return;
    }

    /* Same-grid reorder → persist new positions */
    if (
      source.droppableId === 'main-grid' &&
      destination.droppableId === 'main-grid' &&
      source.index !== destination.index
    ) {
      const reordered = [...homeItems];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      /* Persist position index to DB + switch to manual sort so order survives reload */
      for (let i = 0; i < reordered.length; i++) {
        const it = reordered[i];
        if (it._type === 'folder') {
          setFolders(prev => prev.map(f => f.id === it.id ? { ...f, position: i } : f));
          FolderDB.update(it.id, { position: i }).catch(() => {});
        } else {
          setNotes(prev => prev.map(n => n.id === it.id ? { ...n, position: i } : n));
          NoteDB.update(it.id, { position: i }).catch(() => {});
        }
      }
      setSortId('manual');
    }
  };

  const openNoteDetail = (note) => {
    setOpenNote(note);
    NoteDB.markOpened(note.id).catch(() => {});
  };

  const waveColor = PAGE_WAVE_COLORS[tab] || PAGE_WAVE_COLORS.home;
  const pageBg    = dark ? '#1a1a2e' : '#FFFBFE';

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100dvh', background: pageBg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-4"
          style={{ borderColor: '#FFC7EE', borderTopColor: '#e879a0' }}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex ${landscape ? 'flex-row' : 'flex-col'} relative overflow-hidden`}
      style={{ height: '100dvh', background: pageBg, fontFamily: 'Quicksand, sans-serif', maxWidth: landscape ? 'none' : 480, margin: '0 auto' }}
    >
      <DotGrid dark={dark} />

      {/* ── Landscape: vertical wave on the left ── */}
      {landscape && (
        <div className="relative shrink-0" style={{ width: 60, height: '100dvh' }}>
          <div className="absolute inset-0" style={{ background: waveColor }} />
          {/* scaleX(-1) flips the wave so bumps point INTO the page content */}
          <div style={{ transform: 'scaleX(-1)', width: '100%', height: '100%' }}>
            <TripleWave color={dark ? '#2d2d4a' : '#FAFAFA'} vertical />
          </div>
        </div>
      )}

      {/* ── Portrait: wave header ── */}
      {!landscape && (
        <div
          className="relative shrink-0 z-10"
          style={{ background: waveColor, minHeight: scrolled ? 90 : 130, transition: 'min-height 0.3s ease' }}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-4 pb-8 relative z-10"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}
          >
            {/* Title + mascot below (mascot is static, hidden when header compacts) */}
            <div className="flex flex-col leading-none">
              <h1
                className="text-2xl leading-none select-none"
                style={{ fontFamily: '"Cherry Bomb One", cursive', color: '#111827' }}
              >
                Noty's
              </h1>
              {!scrolled && (
                <Mascot variant="spa" size={36} animate={false} />
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSort(v => !v)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-90"
                style={{ background: 'rgba(0,0,0,0.08)' }}
              >
                <SlidersHorizontal size={15} style={{ color: '#374151' }} />
              </button>
              <button
                onClick={() => setDark(v => !v)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-90"
                style={{ background: 'rgba(0,0,0,0.08)' }}
              >
                {dark
                  ? <Sun  size={15} style={{ color: '#374151' }} />
                  : <Moon size={15} style={{ color: '#374151' }} />}
              </button>
              <button
                onClick={() => setShowHelp(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-90"
                style={{ background: 'rgba(0,0,0,0.08)' }}
              >
                <HelpCircle size={15} style={{ color: '#374151' }} />
              </button>
            </div>
          </div>

          {/* Sort bar */}
          <AnimatePresence>
            {showSort && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden px-4 pb-2 -mt-4"
              >
                <SortMenu value={sortId} onChange={v => { setSortId(v); setShowSort(false); }} />
              </motion.div>
            )}
          </AnimatePresence>

          <TripleWave color={dark ? '#1a1a2e' : '#FFFBFE'} scrolled={scrolled} wiggle={animated && wiggle} />
        </div>
      )}

      {/* ── Main scrollable content ── */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto"
        style={{ paddingBottom: 80, touchAction: 'pan-y' }}
        onScroll={onScroll}
      >
        <AnimatePresence mode="wait">

          {/* HOME */}
          {tab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
              {/* Mini Noty + section label — mirrors the Favorites header */}
              <div className="flex items-center gap-2 mb-4">
                <Mascot variant="spa" size={50} animate={animated} />
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Notes &amp; Dossiers</p>
              </div>
              {homeItems.length === 0
                ? <EmptyState tab="home" animated={animated} />
                : <ItemGrid
                    items={homeItems}
                    folders={foldersWithCount}
                    onOpenNote={openNoteDetail}
                    onOpenFolder={f => setOpenFolder(f)}
                    onToggleStar={handleToggleStar}
                    onDelete={handleDelete}
                    /* Opens the ColorChangeModal — persisted in handleColorChange */
                    onColorChange={item => setColorTarget(item)}
                    onDragEnd={handleDragEnd}
                    dark={dark}
                  />
              }
            </motion.div>
          )}

          {/* FAVORITES */}
          {tab === 'fav' && (
            <motion.div key="fav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Mascot variant={favNotes.length > 0 ? 'stars' : 'float'} size={50} animate={animated} />
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Favoris</p>
              </div>
              {favNotes.length === 0
                ? <EmptyState tab="fav" animated={animated} />
                : <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    {favNotes.map(n => (
                      <GridCard
                        key={n.id} item={n} type="note"
                        onOpen={openNoteDetail}
                        onToggleStar={handleToggleStar}
                        onDelete={handleDelete}
                        onColorChange={item => setColorTarget(item)}
                        dark={dark}
                      />
                    ))}
                  </div>
              }
            </motion.div>
          )}

          {/* SEARCH */}
          {tab === 'search' && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Mascot variant="snorkel" size={42} animate={animated} />
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
                  <input
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Rechercher..."
                    autoFocus
                    className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm outline-none border-2"
                    style={{
                      borderColor: '#b4daf3',
                      background: '#b4daf322',
                      color: dark ? '#f0f0f0' : '#111827',
                      fontFamily: 'Quicksand, sans-serif',
                    }}
                  />
                </div>
              </div>
              {searchQ && searchResults.length === 0
                ? <EmptyState tab="search" hasQuery animated={animated} />
                : !searchQ
                  ? <EmptyState tab="search" animated={animated} />
                  : <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      {searchResults.map(item => (
                        <GridCard
                          key={`${item._type}-${item.id}`}
                          item={item}
                          type={item._type}
                          onOpen={item._type === 'folder' ? f => setOpenFolder(f) : openNoteDetail}
                          onToggleStar={item._type === 'note' ? handleToggleStar : () => {}}
                          onDelete={handleDelete}
                          onColorChange={i => setColorTarget(i)}
                          dark={dark}
                        />
                      ))}
                    </div>
              }
            </motion.div>
          )}

          {/* BACKUP tab */}
          {tab === 'backup' && (
            <motion.div key="backup-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <Mascot variant="backpack" size={110} animate={animated} />
              <p className="font-bold text-base" style={{ fontFamily: 'Quicksand, sans-serif', color: dark ? '#f0f0f0' : '#111827' }}>
                Sauvegarde
              </p>
              <button
                onClick={onGoBackup}
                className="px-6 py-3 rounded-2xl font-bold text-sm"
                style={{ background: '#ffadad', color: '#7f1d1d', fontFamily: 'Quicksand, sans-serif' }}
              >
                Ouvrir la sauvegarde →
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── FAB ── */}
      <div className="fixed z-40" style={{ bottom: 86, right: 20 }}>
        <AnimatePresence>
          {showFab && (
            <>
              {[
                { icon: Folder,   label: 'Dossier', type: 'folder', color: '#c9e7c3', fg: '#166534', offset: 160 },
                { icon: FileText, label: 'Note',    type: 'note',   color: '#ffc7ee', fg: '#831843', offset: 108 },
                { icon: Mic,      label: 'Vocale',  type: 'voice',  color: '#b4daf3', fg: '#1e3a5f', offset: 56  },
              ].map(({ icon: Icon, label, type, color, fg, offset }) => (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: -offset }}
                  exit={{ opacity: 0, y: 0 }}
                  className="absolute right-0 bottom-0 flex items-center gap-2"
                >
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold shadow"
                    style={{ background: 'white', color: fg, fontFamily: 'Quicksand, sans-serif', whiteSpace: 'nowrap' }}
                  >
                    {label}
                  </motion.span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      setShowFab(false);
                      setCreateType(type);   // remembered for defaultType
                      setShowCreate(true);
                    }}
                    className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: color }}
                  >
                    <Icon size={18} style={{ color: fg }} />
                  </motion.button>
                </motion.div>
              ))}
              <div className="fixed inset-0 z-[-1]" onClick={() => setShowFab(false)} />
            </>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowFab(v => !v)}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, #f9a8d4, #e879a0)', boxShadow: '0 8px 32px #f9a8d490' }}
        >
          <motion.div animate={{ rotate: showFab ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus size={26} style={{ color: 'white' }} strokeWidth={2.5} />
          </motion.div>
        </motion.button>
      </div>

      {/* ── Bottom nav ── */}
      {!landscape && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30"
          style={{
            background: dark ? 'rgba(26,26,46,0.97)' : 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(16px)',
            borderTop: dark ? '1px solid #2d2d4a' : '1px solid #F3F4F6',
          }}
        >
          <div className="flex h-16">
            {[
              { id: 'home',   label: 'Accueil',   Icon: HomeIcon,  wave: PAGE_WAVE_COLORS.home   },
              { id: 'fav',    label: 'Favoris',    Icon: Star,      wave: PAGE_WAVE_COLORS.fav    },
              { id: 'search', label: 'Recherche',  Icon: Search,    wave: PAGE_WAVE_COLORS.search },
              { id: 'backup', label: 'Sauvegarde', Icon: HardDrive, wave: PAGE_WAVE_COLORS.backup },
            ].map(({ id, label, Icon, wave }) => {
              const active = tab === id;
              /* Favorites star uses the wave/page color (#ffe0a0) per spec */
              const starFill = active && id === 'fav' ? '#ffe0a0' : 'none';
              const iconColor = active ? (dark ? '#f0f0f0' : '#111827') : '#9CA3AF';
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all relative"
                >
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute top-0 h-0.5 w-8 rounded-b-full"
                      style={{ background: wave }}
                    />
                  )}
                  <Icon
                    size={20}
                    fill={starFill}
                    style={{ color: iconColor }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: iconColor, fontFamily: 'Quicksand, sans-serif', fontSize: 10 }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── All modals / overlays ── */}
      <CreateModal
        show={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleSave}
        folders={folders}
        parentFolderId={openFolder?.id || null}
        defaultColor={openFolder?.color || null}
        defaultType={createType}   /* pre-selects the correct tab */
      />

      <MoveModal
        show={!!moveTarget}
        item={moveTarget}
        folders={folders}
        onClose={() => setMoveTarget(null)}
        onMove={(item, folder) => { handleMove(item, folder); setMoveTarget(null); }}
      />

      {/* ColorChangeModal — opened when onColorChange(item) is called from a GridCard */}
      <ColorChangeModal
        show={!!colorTarget}
        item={colorTarget}
        onClose={() => setColorTarget(null)}
        onChange={handleColorChange}   /* (item, color) → DB update */
      />

      <HelpModal show={showHelp} onClose={() => setShowHelp(false)} />

      <BackupReminderModal
        show={showBackupReminder}
        onClose={() => setShowBackupReminder(false)}
        onGoBackup={() => { setShowBackupReminder(false); onGoBackup?.(); setTab('backup'); }}
      />

      {/* Note detail layer */}
      {openNote && (
        <NoteDetail
          note={openNote}
          folders={folders}
          onClose={() => setOpenNote(null)}
          onToggleStar={handleToggleStar}
          onDelete={handleDelete}
          onSave={handleSaveNote}
          onColorChange={handleColorChange}
        />
      )}

      {/* Folder layer */}
      {openFolder && (
        <FolderLayer
          folder={openFolder}
          items={folderItems}
          folders={folders}
          onClose={() => setOpenFolder(null)}
          onOpenNote={openNoteDetail}
          onOpenFolder={f => setOpenFolder(f)}
          onToggleStar={handleToggleStar}
          onDelete={handleDelete}
          onColorChange={item => setColorTarget(item)}
          onDragEnd={handleDragEnd}
          dark={dark}
        />
      )}

      {/* Voice recorder for new voice notes */}
      {voiceTarget && (
        <VoiceRecorder
          show
          note={voiceTarget}
          color={voiceTarget.color}
          onSave={audioData => handleSaveNote(voiceTarget, { audio_data: audioData })}
          onClose={() => setVoiceTarget(null)}
        />
      )}
    </div>
  );
}
