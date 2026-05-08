import { PALETTE, DEFAULT_COLOR } from './constants';

export const NOTE_FIELDS   = ['id', 'title', 'content', 'color', 'is_favorite', 'folder_id',
                              'type', 'audio_data', 'created_date', 'updated_date',
                              'last_opened_date', 'position'];
export const FOLDER_FIELDS = ['id', 'name', 'color', 'parent_id', 'created_date', 'updated_date', 'position'];

export const MAX_SUPPORTED_VERSION = 2;
export const VALID_COLORS    = new Set(PALETTE.map(p => p.bg));
export const VALID_NOTE_TYPES = new Set(['note', 'voice']);

export const pick = (obj, fields) =>
  Object.fromEntries(fields.filter(k => k in obj).map(k => [k, obj[k]]));

/* Detects circular parent chains in a folder list */
export function hasFolderCycle(folders) {
  const parentMap = Object.fromEntries(
    folders.map(f => [String(f.id), f.parent_id != null ? String(f.parent_id) : null])
  );
  for (const f of folders) {
    const visited = new Set();
    let cur = parentMap[String(f.id)];
    while (cur != null) {
      if (visited.has(cur)) return true;
      visited.add(cur);
      cur = parentMap[cur] ?? null;
    }
  }
  return false;
}

/* Validates the top-level schema of an import payload. Throws on first error. */
export function validateImportSchema(data) {
  if (!data || typeof data !== 'object') throw new Error('Format invalide : fichier JSON attendu.');
  if (!Array.isArray(data.notes)) throw new Error('Format invalide : tableau "notes" manquant.');
  if (data.version !== undefined && typeof data.version !== 'number') throw new Error('Format invalide : champ "version" incorrect.');
  if (data.version !== undefined && data.version > MAX_SUPPORTED_VERSION) {
    throw new Error(`Version de sauvegarde ${data.version} non supportée (max : ${MAX_SUPPORTED_VERSION}). Mets l'application à jour.`);
  }
  if (data.folders !== undefined && !Array.isArray(data.folders)) throw new Error('Format invalide : tableau "folders" incorrect.');
  if (data.notes.some(n => typeof n !== 'object' || n === null)) throw new Error('Format invalide : une ou plusieurs notes sont corrompues.');
  if (data.folders && hasFolderCycle(data.folders)) throw new Error('Structure corrompue : cycle détecté dans les dossiers.');
}

/* Sanitises a single note's fields before DB insertion */
export function sanitiseNote(raw) {
  const note = { ...raw };
  if (typeof note.title !== 'string')      note.title       = '';
  if (!VALID_COLORS.has(note.color))       note.color       = DEFAULT_COLOR;
  if (!VALID_NOTE_TYPES.has(note.type))    note.type        = 'note';
  if (typeof note.is_favorite !== 'boolean') note.is_favorite = false;

  if (note.audio_data != null) {
    const isValidUri = typeof note.audio_data === 'string' &&
      note.audio_data.startsWith('data:audio/');
    let tooLarge = false;
    if (isValidUri) {
      const b64     = note.audio_data.split(',')[1] ?? '';
      const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
      const decoded = Math.floor(b64.length * 3 / 4) - padding;
      tooLarge = decoded > 10 * 1_048_576;
    }
    if (!isValidUri || tooLarge) note.audio_data = null;
  }

  return note;
}
