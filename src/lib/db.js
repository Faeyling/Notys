import Dexie from 'dexie';

export const db = new Dexie('NotysDB_v5');

db.version(1).stores({
  notes: '++id, title, content, color, is_favorite, folder_id, type, audio_data, created_date, updated_date, last_opened_date',
  folders: '++id, name, color, parent_id, created_date, updated_date',
  settings: '++id, &key, value',
});

function now() { return new Date().toISOString(); }

export const NoteDB = {
  async list() { return db.notes.toArray(); },
  async create(data) {
    const record = { ...data, created_date: now(), updated_date: now(), last_opened_date: now() };
    const id = await db.notes.add(record);
    return { ...record, id };
  },
  async update(id, data) {
    const patch = { ...data, updated_date: now() };
    await db.notes.update(id, patch);
    return { id, ...patch };
  },
  async markOpened(id) {
    await db.notes.update(id, { last_opened_date: now() });
  },
  async delete(id) { await db.notes.delete(id); },
  async bulkCreate(items) {
    const records = items.map(i => ({ ...i, created_date: now(), updated_date: now(), last_opened_date: now() }));
    const ids = await db.notes.bulkAdd(records, { allKeys: true });
    return records.map((r, i) => ({ ...r, id: ids[i] }));
  },
  async clear() { await db.notes.clear(); },
};

export const FolderDB = {
  async list() { return db.folders.toArray(); },
  async create(data) {
    const record = { ...data, created_date: now(), updated_date: now() };
    const id = await db.folders.add(record);
    return { ...record, id };
  },
  async update(id, data) {
    const patch = { ...data, updated_date: now() };
    await db.folders.update(id, patch);
    return { id, ...patch };
  },
  async delete(id) { await db.folders.delete(id); },
  async bulkCreate(items) {
    const records = items.map(i => ({ ...i, created_date: now(), updated_date: now() }));
    const ids = await db.folders.bulkAdd(records, { allKeys: true });
    return records.map((r, i) => ({ ...r, id: ids[i] }));
  },
  async clear() { await db.folders.clear(); },
};

export const SettingsDB = {
  async get(key) {
    const row = await db.settings.where('key').equals(key).first();
    return row ? row.value : null;
  },
  async set(key, value) {
    const existing = await db.settings.where('key').equals(key).first();
    if (existing) await db.settings.update(existing.id, { value });
    else await db.settings.add({ key, value });
  },
};

export function sortItems(items, sortId) {
  const arr = [...items];
  switch (sortId) {
    case 'date_desc': return arr.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
    case 'date_asc':  return arr.sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''));
    case 'name_asc':  return arr.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
    case 'name_desc': return arr.sort((a, b) => (b.title || b.name || '').localeCompare(a.title || a.name || ''));
    case 'color':     return arr.sort((a, b) => (a.color || '').localeCompare(b.color || ''));
    case 'opened':    return arr.sort((a, b) => (b.last_opened_date || b.updated_date || '').localeCompare(a.last_opened_date || a.updated_date || ''));
    default:          return arr;
  }
}
