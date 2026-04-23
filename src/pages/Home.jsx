import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Home as HomeIcon, Star, Search, HardDrive,
  HelpCircle, Moon, Sun, SlidersHorizontal, Folder, FileText, Mic, X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db, NoteDB, FolderDB, sortItems } from '@/lib/db';
import { PAGE_WAVE_COLORS, PALETTE } from '@/lib/constants';
import DotGrid from '@/components/DotGrid';
import TripleWave from '@/components/TripleWave';
import GridCard from '@/components/GridCard';
import CreateModal from '@/components/CreateModal';
import NoteDetail from '@/components/NoteDetail';
import FolderLayer from '@/components/FolderLayer';
import ColorChangeModal from '@/components/ColorChangeModal';
import HelpModal from '@/components/HelpModal';
import SortMenu from '@/components/SortMenu';
import BackupReminderModal from '@/components/BackupReminderModal';
import VoiceRecorder from '@/components/VoiceRecorder';
import Mascot from '@/components/Mascot';
import useOrientation from '@/hooks/useOrientation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

/* ── Cycle detection for folder moves ─────────────────── *
   Returns the Set of all descendant folder IDs of `folderId`.
   Used to prevent A→B→A circular parent chains.              */
function getAllDescendantIds(folderId, allFolders) {
  const result = new Set();
  const queue  = [folderId];
  while (queue.length) {
    const id = queue.shift();
    for (const f of allFolders) {
      if (f.parent_id === id && !result.has(f.id)) {
        result.add(f.id);
        queue.push(f.id);
      }
    }
  }
  return result;
}

/* ── Sunday backup check ──────────────────────────────── */
function shouldShowBackupReminder() {
  if (new Date().getDay() !== 0) return false;
  try {
    const key = 'notys-backup-reminder-week';
    /* Store the exact YYYY-MM-DD of the Sunday so each Sunday = one reminder max */
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(key) === today) return false;
    localStorage.setItem(key, today);
    return true;
  } catch {
    /* localStorage unavailable (private mode quota exceeded) — skip reminder */
    return false;
  }
}

/* ── Empty-state mascots ──────────────────────────────── */
function EmptyState({ tab, hasQuery, animated, dark }) {
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
      <p className="font-bold text-base text-center" style={{ fontFamily: 'Quicksand, sans-serif', color: dark ? '#f0f0f0' : '#111827' }}>{s.title}</p>
      <p className="text-sm text-center max-w-xs" style={{ fontFamily: 'Quicksand, sans-serif', color: '#9CA3AF' }}>{s.sub}</p>
    </motion.div>
  );
}

/* ── Unified grid with DnD ──────────────────────────── */
function ItemGrid({ items, folders, onOpenNote, onOpenFolder, onToggleStar, onDelete, onColorChange, onRename, onDragEnd, dark }) {
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
                                onRename={onRename}
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

/* Maximum search results rendered at once — prevents UI freeze on large datasets */
const MAX_SEARCH_RESULTS = 120;

/* ── Main App ─────────────────────────────────────────── */
export default function Home({ onGoBackup, dark, setDark, animated, onRegisterBack, dataVersion = 0 }) {
  const landscape = useOrientation();

  const [tab, setTab]           = useState('home');
  const [notes, setNotes]       = useState([]);
  const [folders, setFolders]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sortId, setSortId]     = useState(() => {
    try { return localStorage.getItem('notys-sort') || 'date_desc'; }
    catch { return 'date_desc'; } /* localStorage unavailable in some private modes */
  });
  const [showSort, setShowSort] = useState(false);
  const [searchQ, setSearchQ]   = useState('');

  const [dragError, setDragError]         = useState(false);
  const [quotaError, setQuotaError]       = useState(false);
  const [showCreate, setShowCreate]       = useState(false);
  const [createType, setCreateType]       = useState('note');
  const [openNote, setOpenNote]           = useState(null);
  const [openFolder, setOpenFolder]       = useState(null);
  const [colorTarget, setColorTarget]     = useState(null);
  const [voiceTarget, setVoiceTarget]     = useState(null);
  const [showHelp, setShowHelp]           = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [showFab, setShowFab]             = useState(false);

  const scrollRef          = useRef(null);
  const deletingIdsRef     = useRef(new Set());
  /* togglingStarRef: prevents a rapid double-tap from toggling twice before the
     first DB write resolves, which would leave the UI in a diverged state. */
  const togglingStarRef    = useRef(new Set());
  /* isDraggingRef: prevents a second drag from starting DB writes while the
     first batch of position writes is still in-flight. */
  const isDraggingRef      = useRef(false);
  const [scrolled, setScrolled] = useState(false);
  const [wiggle, setWiggle]     = useState(false);
  const wiggleTimer             = useRef(null);

  /* ── Back-button handler (registered once via refs) ───── */
  const openNoteRef   = useRef(null);
  const openFolderRef = useRef(null);
  useEffect(() => { openNoteRef.current   = openNote;   }, [openNote]);
  useEffect(() => { openFolderRef.current = openFolder; }, [openFolder]);

  useEffect(() => {
    onRegisterBack?.(() => {
      if (openNoteRef.current)   { setOpenNote(null);   return true; }
      if (openFolderRef.current) { setOpenFolder(null); return true; }
      return false;
    });
    return () => clearTimeout(wiggleTimer.current);
  }, []); /* mount only — refs stay current */

  /* Load data — re-runs when dataVersion bumps (e.g. after Backup import).
     The `cancelled` flag guards against stale promise resolutions when the
     component remounts or dataVersion changes before the previous fetch ends. */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([NoteDB.list(), FolderDB.list()])
      .then(([n, f]) => {
        if (cancelled) return;
        /* Filter out any corrupted records (missing id) to prevent crash on .map() */
        setNotes(n.filter(x => x != null && x.id != null));
        setFolders(f.filter(x => x != null && x.id != null));
      })
      .catch(() => { if (!cancelled) { setNotes([]); setFolders([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    if (dataVersion === 0) {
      setTimeout(() => { if (shouldShowBackupReminder()) setShowBackupReminder(true); }, 2000);
    }
    return () => { cancelled = true; };
  }, [dataVersion]);

  /* Sort persistence */
  useEffect(() => {
    try { localStorage.setItem('notys-sort', sortId); } catch { /* quota or security */ }
  }, [sortId]);

  /* Sync browser/OS status-bar color with the active tab wave color */
  useEffect(() => {
    const color = PAGE_WAVE_COLORS[tab] || PAGE_WAVE_COLORS.home;
    const meta  = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color);
  }, [tab]);

  /* Scroll handler — hysteresis prevents jitter when content barely fills
     the page: compact header at y>40, expand back only below y<15 */
  const onScroll = useCallback((e) => {
    const el = e.currentTarget;
    const y  = el.scrollTop;
    setScrolled(prev => (prev ? y > 15 : y > 40));
    /* Only animate wiggle when there is actually something to scroll — prevents a
       layout-feedback loop on short lists where the wave's scaleY animation
       changes the header height, which alters scrollHeight, which re-fires onScroll. */
    if (el.scrollHeight > el.clientHeight + 1) {
      setWiggle(true);
      clearTimeout(wiggleTimer.current);
      wiggleTimer.current = setTimeout(() => setWiggle(false), 400);
    }
  }, []);

  /* O(n+m) maps for note/folder counts — recalculated only when data changes */
  const noteCountByFolder = useMemo(() => {
    const map = {};
    for (const n of notes) {
      if (n.folder_id != null) map[n.folder_id] = (map[n.folder_id] || 0) + 1;
    }
    return map;
  }, [notes]);

  const folderCountByParent = useMemo(() => {
    const map = {};
    for (const f of folders) {
      if (f.parent_id != null) map[f.parent_id] = (map[f.parent_id] || 0) + 1;
    }
    return map;
  }, [folders]);

  const foldersWithCount = useMemo(() => folders.map(f => ({
    ...f,
    _noteCount:   noteCountByFolder[f.id]   || 0,
    _folderCount: folderCountByParent[f.id] || 0,
    _type: 'folder',
  })), [folders, noteCountByFolder, folderCountByParent]);

  /* Derived views — memoised so scroll/wiggle/FAB state changes don't
     trigger unnecessary re-filtering of potentially large note arrays */
  const rootNotes = useMemo(() => notes.filter(n => !n.folder_id), [notes]);
  const rootFolders = useMemo(() => foldersWithCount.filter(f => !f.parent_id), [foldersWithCount]);
  const homeItems = useMemo(() => sortItems(
    [...rootFolders, ...rootNotes.map(n => ({ ...n, _type: 'note' }))],
    sortId,
  ), [rootFolders, rootNotes, sortId]);
  const favNotes = useMemo(() => sortItems(
    notes.filter(n => n.is_favorite).map(n => ({ ...n, _type: 'note' })),
    sortId,
  ), [notes, sortId]);
  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const all = [
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
    return all.slice(0, MAX_SEARCH_RESULTS);
  }, [searchQ, foldersWithCount, notes]);

  /* Total unsliced count — used to display the "X autres résultats" badge */
  const searchTotal = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return 0;
    return (
      foldersWithCount.filter(f => f.name?.toLowerCase().includes(q)).length +
      notes.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q)
      ).length
    );
  }, [searchQ, foldersWithCount, notes]);

  /* Folder layer items */
  const folderNotes = useMemo(() => openFolder
    ? notes.filter(n => n.folder_id === openFolder.id).map(n => ({ ...n, _type: 'note' }))
    : [], [openFolder?.id, notes]);
  const subFolders = useMemo(() => openFolder
    ? foldersWithCount.filter(f => f.parent_id === openFolder.id)
    : [], [openFolder?.id, foldersWithCount]);
  const folderItems = useMemo(() => sortItems([...subFolders, ...folderNotes], sortId),
    [subFolders, folderNotes, sortId]);

  /* ── Quota error helper ── */
  const showQuotaError = () => {
    setQuotaError(true);
    setTimeout(() => setQuotaError(false), 4000);
  };

  /* ── Actions ── */
  const handleSave = async (data) => {
    try {
      if (data.type === 'folder') {
        /* In manual sort: prepend before the current first item */
        const topPos = sortId === 'manual'
          ? (homeItems[0]?.position ?? 0) - 1
          : undefined;
        const payload = {
          name: data.title, color: data.color, parent_id: openFolder?.id || null,
          ...(topPos !== undefined && { position: topPos }),
        };
        const f = await FolderDB.create(payload);
        setFolders(prev => [f, ...prev]);
      } else {
        const folderColor = data.folder_id
          ? folders.find(f => f.id === Number(data.folder_id))?.color
          : null;
        /* In manual sort: prepend before the current first item */
        const topPos = sortId === 'manual'
          ? (homeItems[0]?.position ?? 0) - 1
          : undefined;
        const payload = {
          title: data.title, content: data.content,
          color: folderColor || data.color,
          is_favorite: false,
          folder_id: data.folder_id ? Number(data.folder_id) : (openFolder?.id || null),
          type: data.type === 'voice' ? 'voice' : 'note',
          ...(topPos !== undefined && { position: topPos }),
        };
        const n = await NoteDB.create(payload);
        setNotes(prev => [n, ...prev]);
        if (data.type === 'voice') setVoiceTarget(n);
      }
    } catch (err) {
      /* IndexedDB storage full — show a user-facing toast and re-throw so CreateModal
         can reset its success state (it now awaits onSave). */
      if (err?.name === 'QuotaExceededError' || err?.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        showQuotaError();
      }
      throw err;
    }
  };

  const handleToggleStar = async (note) => {
    /* Skip if a toggle is already in-flight for this note — prevents a rapid
       double-tap from applying two writes with the same base state, which would
       leave the DB and UI diverged after the second rollback. */
    if (togglingStarRef.current.has(note.id)) return;
    togglingStarRef.current.add(note.id);
    const updated = { ...note, is_favorite: !note.is_favorite };
    setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
    if (openNote?.id === note.id) setOpenNote(updated);
    try {
      await NoteDB.update(note.id, { is_favorite: updated.is_favorite });
    } catch {
      setNotes(prev => prev.map(n => n.id === note.id ? note : n));
      if (openNote?.id === note.id) setOpenNote(note);
    } finally {
      togglingStarRef.current.delete(note.id);
    }
  };

  const handleSaveNote = async (note, changes) => {
    const updated = { ...note, ...changes };
    setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
    if (openNote?.id === note.id) setOpenNote(updated);
    /* Let the error propagate — NoteDetail's autoSave catches it to show the error chip */
    await NoteDB.update(note.id, changes);
  };

  const handleDelete = async (item) => {
    /* Prevent a double-tap/double-click from firing two concurrent deletes */
    const key = `${item._type}-${item.id}`;
    if (deletingIdsRef.current.has(key)) return;
    deletingIdsRef.current.add(key);

    const isFolder = item._type === 'folder';
    /* Optimistic UI update first so the card disappears immediately */
    if (isFolder) {
      setFolders(prev => prev.filter(f => f.id !== item.id));
    } else {
      setNotes(prev => prev.filter(n => n.id !== item.id));
    }
    if (openNote?.id === item.id) setOpenNote(null);
    try {
      if (isFolder) {
        /* Identify orphans before the transaction so we can update UI after */
        const orphans = notes.filter(n => n.folder_id === item.id);
        /* Atomic transaction: if any step fails, IndexedDB rolls back entirely */
        await db.transaction('rw', db.notes, db.folders, async () => {
          await db.folders.delete(item.id);
          for (const n of orphans) await db.notes.update(n.id, { folder_id: null });
        });
        /* Only update notes in UI after the DB transaction commits successfully */
        setNotes(prev => prev.map(n =>
          orphans.some(o => o.id === n.id) ? { ...n, folder_id: null } : n
        ));
      } else {
        await NoteDB.delete(item.id);
      }
      /* Confetti only fires after the DB confirms the delete */
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 }, colors: [item.color, '#fff', '#ffc7ee'] });
    } catch {
      /* DB failed — restore the item in the UI (notes were never changed) */
      if (isFolder) setFolders(prev => [...prev, item]);
      else setNotes(prev => [...prev, item]);
    } finally {
      deletingIdsRef.current.delete(key);
    }
  };

  const handleRename = async (item, newName) => {
    const oldName = item.name;
    setFolders(prev => prev.map(f => f.id === item.id ? { ...f, name: newName } : f));
    if (openFolder?.id === item.id) setOpenFolder(f => ({ ...f, name: newName }));
    try {
      await FolderDB.update(item.id, { name: newName });
    } catch {
      setFolders(prev => prev.map(f => f.id === item.id ? { ...f, name: oldName } : f));
      if (openFolder?.id === item.id) setOpenFolder(f => ({ ...f, name: oldName }));
    }
  };

  const handleMove = async (item, targetFolder) => {
    const isFolder = item._type === 'folder';
    const newId = targetFolder?.id ?? null;
    if (isFolder && targetFolder) {
      /* Guard: refuse to move a folder into itself or into one of its descendants */
      const descendants = getAllDescendantIds(item.id, folders);
      if (targetFolder.id === item.id || descendants.has(targetFolder.id)) return;
    }
    if (isFolder) {
      const oldParentId = item.parent_id ?? null;
      setFolders(prev => prev.map(f => f.id === item.id ? { ...f, parent_id: newId } : f));
      try {
        await FolderDB.update(item.id, { parent_id: newId });
      } catch {
        setFolders(prev => prev.map(f => f.id === item.id ? { ...f, parent_id: oldParentId } : f));
      }
    } else {
      const folderColor = targetFolder?.color;
      const updated = { ...item, folder_id: newId, ...(folderColor ? { color: folderColor } : {}) };
      setNotes(prev => prev.map(n => n.id === item.id ? updated : n));
      if (openNote?.id === item.id) setOpenNote(updated);
      try {
        await NoteDB.update(item.id, { folder_id: newId, ...(folderColor ? { color: folderColor } : {}) });
      } catch {
        setNotes(prev => prev.map(n => n.id === item.id ? item : n));
        if (openNote?.id === item.id) setOpenNote(item);
      }
    }
  };

  /**
   * handleColorChange — persists the new color to DB immediately.
   * Called from ColorChangeModal (item, color) or NoteDetail.
   */
  const handleColorChange = async (item, color) => {
    /* Reject any color not in the official palette */
    if (!PALETTE.some(p => p.bg === color)) return;
    const isFolder = item._type === 'folder';
    const oldColor = item.color;
    if (isFolder) {
      setFolders(prev => prev.map(f => f.id === item.id ? { ...f, color } : f));
      try {
        await FolderDB.update(item.id, { color });
      } catch {
        setFolders(prev => prev.map(f => f.id === item.id ? { ...f, color: oldColor } : f));
      }
    } else {
      const updated = { ...item, color };
      setNotes(prev => prev.map(n => n.id === item.id ? updated : n));
      if (openNote?.id === item.id) setOpenNote(updated);
      try {
        await NoteDB.update(item.id, { color });
      } catch {
        setNotes(prev => prev.map(n => n.id === item.id ? { ...n, color: oldColor } : n));
        if (openNote?.id === item.id) setOpenNote(prev => ({ ...prev, color: oldColor }));
      }
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (isDraggingRef.current) return; /* previous DB writes still in-flight */

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
      /* Optimistic UI update */
      setSortId('manual');
      reordered.forEach((it, i) => {
        if (it._type === 'folder') setFolders(prev => prev.map(f => f.id === it.id ? { ...f, position: i } : f));
        else setNotes(prev => prev.map(n => n.id === it.id ? { ...n, position: i } : n));
      });
      /* Persist to DB — guard against a second drag firing before these writes
         complete, which could interleave position values from two separate drags. */
      isDraggingRef.current = true;
      const writes = reordered.map((it, i) =>
        it._type === 'folder'
          ? FolderDB.update(it.id, { position: i })
          : NoteDB.update(it.id, { position: i })
      );
      Promise.all(writes)
        .catch(async () => {
          /* DB writes failed — reload authoritative state and notify user */
          setDragError(true);
          setTimeout(() => setDragError(false), 3000);
          const [n, f] = await Promise.all([NoteDB.list(), FolderDB.list()]);
          setNotes(n.filter(x => x != null && x.id != null));
          setFolders(f.filter(x => x != null && x.id != null));
        })
        .finally(() => { isDraggingRef.current = false; });
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
      <div
        className="flex flex-col items-center justify-center gap-3"
        style={{ height: '100dvh', background: pageBg }}
        role="status"
        aria-label="Chargement des notes…"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-4"
          style={{ borderColor: '#FFC7EE', borderTopColor: '#e879a0' }}
          aria-hidden="true"
        />
        <p className="text-sm font-semibold" style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}>
          Chargement…
        </p>
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
          {/* Top bar + sort bar in one block so sort flows naturally below title */}
          <div
            className="relative z-10 px-4 pb-8"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}
          >
            {/* Title row */}
            <div className="flex items-center justify-between mb-1">
              {/* Title + mascot below (mascot hidden when header compacts) */}
              <div className="flex flex-col leading-none">
                <h1
                  className="text-2xl leading-none select-none"
                  style={{ fontFamily: '"Cherry Bomb One", cursive', color: '#111827' }}
                >
                  Noty's
                </h1>
                {!scrolled && (
                  <Mascot variant="spa" size={36} animate={false} aria-hidden="true" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSort(v => !v)}
                  aria-label="Trier les notes"
                  aria-expanded={showSort}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-90"
                  style={{ background: 'rgba(0,0,0,0.08)' }}
                >
                  <SlidersHorizontal size={15} style={{ color: '#374151' }} />
                </button>
                <button
                  onClick={() => setDark(v => !v)}
                  aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-90"
                  style={{ background: 'rgba(0,0,0,0.08)' }}
                >
                  {dark
                    ? <Sun  size={15} style={{ color: '#374151' }} />
                    : <Moon size={15} style={{ color: '#374151' }} />}
                </button>
                <button
                  onClick={() => setShowHelp(true)}
                  aria-label="Aide"
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-90"
                  style={{ background: 'rgba(0,0,0,0.08)' }}
                >
                  <HelpCircle size={15} style={{ color: '#374151' }} />
                </button>
              </div>
            </div>

            {/* Sort bar — immediately below title row, inside the same padded block */}
            <AnimatePresence>
              {showSort && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden pt-2"
                >
                  <SortMenu value={sortId} onChange={v => { setSortId(v); setShowSort(false); }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <TripleWave color={dark ? '#1a1a2e' : '#FFFBFE'} scrolled={scrolled} wiggle={animated && wiggle} />
        </div>
      )}

      {/* ── Main scrollable content ── */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto"
        style={{ paddingBottom: 80, touchAction: 'pan-y', overscrollBehavior: 'contain' }}
        onScroll={onScroll}
      >
        <AnimatePresence mode="wait">

          {/* HOME */}
          {tab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
              {/* Mini Noty + section label — mirrors the Favorites header */}
              <div className="flex items-center gap-2 mb-4">
                <Mascot variant="spa" size={50} animate={animated} aria-hidden="true" />
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}>Notes &amp; Dossiers</h2>
              </div>
              {homeItems.length === 0
                ? <EmptyState tab="home" animated={animated} dark={dark} />
                : <ItemGrid
                    items={homeItems}
                    folders={foldersWithCount}
                    onOpenNote={openNoteDetail}
                    onOpenFolder={f => setOpenFolder(f)}
                    onToggleStar={handleToggleStar}
                    onDelete={handleDelete}
                    onColorChange={item => setColorTarget(item)}
                    onRename={handleRename}
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
                <Mascot variant={favNotes.length > 0 ? 'stars' : 'float'} size={50} animate={animated} aria-hidden="true" />
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}>Favoris</h2>
              </div>
              {favNotes.length === 0
                ? <EmptyState tab="fav" animated={animated} dark={dark} />
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
                <Mascot variant="snorkel" size={42} animate={animated} aria-hidden="true" />
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
                  <input
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Rechercher..."
                    aria-label="Rechercher tes notes"
                    autoFocus
                    className="w-full pl-9 py-2.5 rounded-2xl text-sm outline-none border-2"
                    style={{
                      paddingRight: searchQ ? '2.25rem' : '1rem',
                      borderColor: '#b4daf3',
                      background: '#b4daf322',
                      color: dark ? '#f0f0f0' : '#111827',
                      fontFamily: 'Quicksand, sans-serif',
                    }}
                  />
                  {searchQ && (
                    <button
                      onClick={() => setSearchQ('')}
                      aria-label="Effacer la recherche"
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-all hover:scale-110 active:scale-90"
                    >
                      <X size={14} style={{ color: '#9CA3AF' }} />
                    </button>
                  )}
                </div>
              </div>
              {searchQ && searchResults.length === 0
                ? <EmptyState tab="search" hasQuery animated={animated} dark={dark} />
                : !searchQ
                  ? <EmptyState tab="search" animated={animated} dark={dark} />
                  : <>
                      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        {searchResults.map(item => (
                          <GridCard
                            key={`${item._type}-${item.id}`}
                            item={item}
                            type={item._type}
                            onOpen={item._type === 'folder' ? f => setOpenFolder(f) : openNoteDetail}
                            onToggleStar={item._type === 'note' ? handleToggleStar : () => {}}
                            onDelete={handleDelete}
                            onColorChange={i => setColorTarget(i)}
                            onRename={handleRename}
                            dark={dark}
                          />
                        ))}
                      </div>
                      {searchTotal > MAX_SEARCH_RESULTS && (
                        <p
                          className="text-xs text-center pt-2"
                          style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}
                        >
                          {searchTotal - MAX_SEARCH_RESULTS} autre{searchTotal - MAX_SEARCH_RESULTS > 1 ? 's' : ''} résultat{searchTotal - MAX_SEARCH_RESULTS > 1 ? 's' : ''} — affine ta recherche pour les voir
                        </p>
                      )}
                    </>
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
      <div
        className="fixed z-40"
        style={{ bottom: 86, right: 20 }}
        onKeyDown={e => { if (e.key === 'Escape' && showFab) { setShowFab(false); } }}
      >
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
                    aria-label={`Créer une ${label.toLowerCase()}`}
                    className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: color }}
                  >
                    <Icon size={18} style={{ color: fg }} aria-hidden="true" />
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
          aria-label={showFab ? 'Fermer le menu de création' : 'Créer une note ou un dossier'}
          aria-expanded={showFab}
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
        <nav
          aria-label="Navigation principale"
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
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
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
                    aria-hidden="true"
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: iconColor, fontFamily: 'Quicksand, sans-serif', fontSize: 10 }}
                    aria-hidden="true"
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
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

      {/* Note detail layer — key isolates each note instance so its auto-save
          timer and state never bleed into the next note (race condition fix).
          AnimatePresence at this level also drives the exit slide animation. */}
      <AnimatePresence>
        {openNote && (
          <NoteDetail
            key={openNote.id}
            note={openNote}
            folders={folders}
            dark={dark}
            onClose={() => setOpenNote(null)}
            onToggleStar={handleToggleStar}
            onDelete={handleDelete}
            onSave={handleSaveNote}
            onColorChange={handleColorChange}
          />
        )}
      </AnimatePresence>

      {/* Folder layer — key isolates each folder instance so AnimatePresence
          can play exit/enter animations without prop contamination between
          rapid folder switches (race condition fix). */}
      <AnimatePresence>
        {openFolder && (
          <FolderLayer
            key={openFolder.id}
            folder={openFolder}
            items={folderItems}
            folders={folders}
            onClose={() => setOpenFolder(null)}
            onOpenNote={openNoteDetail}
            onOpenFolder={f => setOpenFolder(f)}
            onToggleStar={handleToggleStar}
            onDelete={handleDelete}
            onColorChange={item => setColorTarget(item)}
            onRename={handleRename}
            onDragEnd={handleDragEnd}
            dark={dark}
          />
        )}
      </AnimatePresence>

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

      {/* Screen-reader announcement when the active tab changes */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {tab === 'home' ? 'Accueil' : tab === 'fav' ? 'Favoris' : tab === 'search' ? 'Recherche' : 'Sauvegarde'}
      </span>

      {/* Screen-reader announcement when initial data finishes loading */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {!loading && notes.length > 0
          ? `${notes.length} note${notes.length > 1 ? 's' : ''} et ${folders.length} dossier${folders.length > 1 ? 's' : ''} chargés`
          : ''}
      </span>

      {/* Drag-and-drop error toast */}
      <AnimatePresence>
        {dragError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl shadow-lg pointer-events-none"
            style={{
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              fontFamily: 'Quicksand, sans-serif',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
            role="alert"
          >
            ↩️ Ordre non sauvegardé — réessaie
          </motion.div>
        )}
      </AnimatePresence>

      {/* Storage-full error toast */}
      <AnimatePresence>
        {quotaError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl shadow-lg pointer-events-none"
            style={{
              background: 'rgba(220,38,38,0.85)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              fontFamily: 'Quicksand, sans-serif',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
            role="alert"
          >
            💾 Stockage plein — libère de l'espace et réessaie
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
