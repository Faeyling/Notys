import { describe, it, expect } from 'vitest';
import {
  hasFolderCycle,
  validateImportSchema,
  sanitiseNote,
  MAX_SUPPORTED_VERSION,
} from '../backupUtils.js';

// ─── hasFolderCycle ────────────────────────────────────────────────────────

describe('hasFolderCycle', () => {
  it('returns false for an empty folder list', () => {
    expect(hasFolderCycle([])).toBe(false);
  });

  it('returns false when no folder has a parent', () => {
    const folders = [
      { id: 1, parent_id: null },
      { id: 2, parent_id: null },
    ];
    expect(hasFolderCycle(folders)).toBe(false);
  });

  it('returns false for a valid linear chain A → B → C', () => {
    const folders = [
      { id: 1, parent_id: null },
      { id: 2, parent_id: 1 },
      { id: 3, parent_id: 2 },
    ];
    expect(hasFolderCycle(folders)).toBe(false);
  });

  it('returns false for a valid tree (multiple branches)', () => {
    const folders = [
      { id: 1, parent_id: null },
      { id: 2, parent_id: 1 },
      { id: 3, parent_id: 1 },
      { id: 4, parent_id: 2 },
    ];
    expect(hasFolderCycle(folders)).toBe(false);
  });

  it('returns true when a folder is its own parent', () => {
    const folders = [{ id: 1, parent_id: 1 }];
    expect(hasFolderCycle(folders)).toBe(true);
  });

  it('returns true for a two-node cycle: A → B → A', () => {
    const folders = [
      { id: 1, parent_id: 2 },
      { id: 2, parent_id: 1 },
    ];
    expect(hasFolderCycle(folders)).toBe(true);
  });

  it('returns true for a longer cycle: A → B → C → A', () => {
    const folders = [
      { id: 1, parent_id: 3 },
      { id: 2, parent_id: 1 },
      { id: 3, parent_id: 2 },
    ];
    expect(hasFolderCycle(folders)).toBe(true);
  });
});

// ─── validateImportSchema ──────────────────────────────────────────────────

describe('validateImportSchema', () => {
  const valid = { notes: [], folders: [], version: 2 };

  it('accepts a minimal valid payload', () => {
    expect(() => validateImportSchema(valid)).not.toThrow();
  });

  it('accepts a payload without the optional version field', () => {
    expect(() => validateImportSchema({ notes: [] })).not.toThrow();
  });

  it('accepts a payload without the optional folders field', () => {
    expect(() => validateImportSchema({ notes: [], version: 1 })).not.toThrow();
  });

  it('throws when data is null', () => {
    expect(() => validateImportSchema(null)).toThrow('Format invalide');
  });

  it('throws when data is a string, not an object', () => {
    expect(() => validateImportSchema('bad')).toThrow('Format invalide');
  });

  it('throws when notes is missing', () => {
    expect(() => validateImportSchema({ version: 1 })).toThrow('notes');
  });

  it('throws when notes is not an array', () => {
    expect(() => validateImportSchema({ notes: 'nope' })).toThrow('notes');
  });

  it('throws when version is a string instead of a number', () => {
    expect(() => validateImportSchema({ notes: [], version: '2' })).toThrow('version');
  });

  it('throws when version exceeds MAX_SUPPORTED_VERSION', () => {
    expect(() =>
      validateImportSchema({ notes: [], version: MAX_SUPPORTED_VERSION + 1 })
    ).toThrow('non supportée');
  });

  it('throws when folders is not an array', () => {
    expect(() => validateImportSchema({ notes: [], folders: 'bad' })).toThrow('folders');
  });

  it('throws when a note entry is null', () => {
    expect(() => validateImportSchema({ notes: [null] })).toThrow('corrompues');
  });

  it('throws when a note entry is a primitive', () => {
    expect(() => validateImportSchema({ notes: [42] })).toThrow('corrompues');
  });

  it('throws when folders contain a cycle', () => {
    const folders = [
      { id: 1, parent_id: 2 },
      { id: 2, parent_id: 1 },
    ];
    expect(() => validateImportSchema({ notes: [], folders })).toThrow('cycle');
  });
});

// ─── sanitiseNote ──────────────────────────────────────────────────────────

describe('sanitiseNote', () => {
  const validNote = {
    title: 'Hello',
    color: '#ffadad',
    type: 'note',
    is_favorite: false,
    audio_data: null,
  };

  it('passes through a valid note unchanged', () => {
    const result = sanitiseNote({ ...validNote });
    expect(result.title).toBe('Hello');
    expect(result.color).toBe('#ffadad');
    expect(result.type).toBe('note');
    expect(result.is_favorite).toBe(false);
  });

  it('coerces a missing title to an empty string', () => {
    const result = sanitiseNote({ ...validNote, title: 42 });
    expect(result.title).toBe('');
  });

  it('replaces an unknown color with the default color', () => {
    const result = sanitiseNote({ ...validNote, color: '#000000' });
    expect(result.color).toBe('#b4daf3'); /* DEFAULT_COLOR */
  });

  it('replaces an unknown type with "note"', () => {
    const result = sanitiseNote({ ...validNote, type: 'image' });
    expect(result.type).toBe('note');
  });

  it('accepts type "voice"', () => {
    const result = sanitiseNote({ ...validNote, type: 'voice' });
    expect(result.type).toBe('voice');
  });

  it('coerces a non-boolean is_favorite to false', () => {
    const result = sanitiseNote({ ...validNote, is_favorite: 1 });
    expect(result.is_favorite).toBe(false);
  });

  it('strips audio_data that is not a data URI', () => {
    const result = sanitiseNote({ ...validNote, audio_data: 'http://evil.com/x.mp3' });
    expect(result.audio_data).toBeNull();
  });

  it('strips audio_data whose decoded size exceeds 10 MB', () => {
    /* Simulate a base64 string encoding ~11 MB: 11 * 1024 * 1024 * (4/3) chars */
    const chars = Math.ceil(11 * 1024 * 1024 * (4 / 3));
    const bigB64 = 'A'.repeat(chars);
    const result = sanitiseNote({ ...validNote, audio_data: `data:audio/webm;base64,${bigB64}` });
    expect(result.audio_data).toBeNull();
  });

  it('keeps a valid small audio_data URI', () => {
    const smallB64 = 'AAAA'; /* 3 bytes */
    const uri = `data:audio/webm;base64,${smallB64}`;
    const result = sanitiseNote({ ...validNote, audio_data: uri });
    expect(result.audio_data).toBe(uri);
  });

  it('does not mutate the input object', () => {
    const input = { ...validNote, title: 99 };
    sanitiseNote(input);
    expect(input.title).toBe(99);
  });
});
