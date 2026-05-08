import Dexie from 'dexie';
import { PALETTE } from './constants';

export const db = new Dexie('NotysDB_v5');

db.version(1).stores({
  notes: '++id, title, content, color, is_favorite, folder_id, type, audio_data, created_date, updated_date, last_opened_date',
  folders: '++id, name, color, parent_id, created_date, updated_date',
  settings: '++id, &key, value',
});

function now() { return new Date().toISOString(); }

export const NoteDB = {
  async list() {
    try { return await db.notes.toArray(); }
    catch (err) { console.error('[NoteDB] list:', err); throw err; }
  },
  async create(data) {
    const record = { ...data, created_date: now(), updated_date: now(), last_opened_date: now() };
    try {
      const id = await db.notes.add(record);
      return { ...record, id };
    } catch (err) { console.error('[NoteDB] create:', err); throw err; }
  },
  async update(id, data) {
    const patch = { ...data, updated_date: now() };
    try {
      await db.notes.update(id, patch);
      return { id, ...patch };
    } catch (err) { console.error('[NoteDB] update:', id, err); throw err; }
  },
  async markOpened(id) {
    try { await db.notes.update(id, { last_opened_date: now() }); }
    catch (err) { console.warn('[NoteDB] markOpened:', id, err); /* non-critical, don't rethrow */ }
  },
  async delete(id) {
    try { await db.notes.delete(id); }
    catch (err) { console.error('[NoteDB] delete:', id, err); throw err; }
  },
  async clear() {
    try { await db.notes.clear(); }
    catch (err) { console.error('[NoteDB] clear:', err); throw err; }
  },
};

export const FolderDB = {
  async list() {
    try { return await db.folders.toArray(); }
    catch (err) { console.error('[FolderDB] list:', err); throw err; }
  },
  async create(data) {
    const record = { ...data, created_date: now(), updated_date: now() };
    try {
      const id = await db.folders.add(record);
      return { ...record, id };
    } catch (err) { console.error('[FolderDB] create:', err); throw err; }
  },
  async update(id, data) {
    const patch = { ...data, updated_date: now() };
    try {
      await db.folders.update(id, patch);
      return { id, ...patch };
    } catch (err) { console.error('[FolderDB] update:', id, err); throw err; }
  },
  async delete(id) {
    try { await db.folders.delete(id); }
    catch (err) { console.error('[FolderDB] delete:', id, err); throw err; }
  },
  async clear() {
    try { await db.folders.clear(); }
    catch (err) { console.error('[FolderDB] clear:', err); throw err; }
  },
};

export function sortItems(items, sortId) {
  const arr = [...items];
  switch (sortId) {
    case 'date_desc': return arr.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
    case 'date_asc':  return arr.sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
    case 'name_asc':  return arr.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
    case 'name_desc': return arr.sort((a, b) => (b.title || b.name || '').localeCompare(a.title || a.name || ''));
    case 'color': {
      const order = Object.fromEntries(PALETTE.map((p, i) => [p.bg, i]));
      return arr.sort((a, b) => (order[a.color] ?? 999) - (order[b.color] ?? 999));
    }
    case 'opened':    return arr.sort((a, b) => new Date(b.last_opened_date || b.updated_date || 0) - new Date(a.last_opened_date || a.updated_date || 0));
    case 'manual':    return arr.sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER));
    default:          return arr;
  }
}
