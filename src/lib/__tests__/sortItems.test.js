import { describe, it, expect } from 'vitest';
import { sortItems } from '../db.js';

const note = (overrides) => ({
  id: 1, title: 'Note', _type: 'note',
  created_date: '2024-01-01T00:00:00.000Z',
  updated_date: '2024-01-01T00:00:00.000Z',
  last_opened_date: '2024-01-01T00:00:00.000Z',
  color: '#ffadad',
  position: 0,
  ...overrides,
});

describe('sortItems', () => {
  describe('date_desc', () => {
    it('sorts newest first', () => {
      const items = [
        note({ id: 1, created_date: '2024-01-01T00:00:00.000Z' }),
        note({ id: 2, created_date: '2024-06-01T00:00:00.000Z' }),
        note({ id: 3, created_date: '2023-01-01T00:00:00.000Z' }),
      ];
      const result = sortItems(items, 'date_desc');
      expect(result.map(n => n.id)).toEqual([2, 1, 3]);
    });

    it('handles missing created_date by treating as epoch', () => {
      const items = [
        note({ id: 1, created_date: null }),
        note({ id: 2, created_date: '2024-01-01T00:00:00.000Z' }),
      ];
      const result = sortItems(items, 'date_desc');
      expect(result[0].id).toBe(2);
    });
  });

  describe('date_asc', () => {
    it('sorts oldest first', () => {
      const items = [
        note({ id: 1, created_date: '2024-06-01T00:00:00.000Z' }),
        note({ id: 2, created_date: '2023-01-01T00:00:00.000Z' }),
      ];
      const result = sortItems(items, 'date_asc');
      expect(result[0].id).toBe(2);
    });
  });

  describe('name_asc', () => {
    it('sorts alphabetically A→Z using title', () => {
      const items = [
        note({ id: 1, title: 'Banane' }),
        note({ id: 2, title: 'Abricot' }),
        note({ id: 3, title: 'Cerise' }),
      ];
      const result = sortItems(items, 'name_asc');
      expect(result.map(n => n.title)).toEqual(['Abricot', 'Banane', 'Cerise']);
    });

    it('sorts alphabetically A→Z using name for folders', () => {
      const items = [
        { id: 1, name: 'Zèbre', _type: 'folder', color: '#ffadad' },
        { id: 2, name: 'Ane', _type: 'folder', color: '#ffadad' },
      ];
      const result = sortItems(items, 'name_asc');
      expect(result[0].name).toBe('Ane');
    });
  });

  describe('name_desc', () => {
    it('sorts Z→A', () => {
      const items = [
        note({ id: 1, title: 'Alpha' }),
        note({ id: 2, title: 'Zeta' }),
      ];
      const result = sortItems(items, 'name_desc');
      expect(result[0].title).toBe('Zeta');
    });
  });

  describe('color', () => {
    it('sorts by palette order', () => {
      const items = [
        note({ id: 1, color: '#b4daf3' }),  // index 8
        note({ id: 2, color: '#ffadad' }),  // index 0
        note({ id: 3, color: '#ffc7ee' }),  // index 10
      ];
      const result = sortItems(items, 'color');
      expect(result.map(n => n.id)).toEqual([2, 1, 3]);
    });

    it('puts unknown colors at the end', () => {
      const items = [
        note({ id: 1, color: '#000000' }),  // unknown
        note({ id: 2, color: '#ffadad' }),  // index 0
      ];
      const result = sortItems(items, 'color');
      expect(result[0].id).toBe(2);
    });
  });

  describe('opened', () => {
    it('sorts by last_opened_date descending', () => {
      const items = [
        note({ id: 1, last_opened_date: '2024-01-01T00:00:00.000Z' }),
        note({ id: 2, last_opened_date: '2024-12-01T00:00:00.000Z' }),
      ];
      const result = sortItems(items, 'opened');
      expect(result[0].id).toBe(2);
    });

    it('falls back to updated_date when last_opened_date is missing', () => {
      const items = [
        note({ id: 1, last_opened_date: null, updated_date: '2024-01-01T00:00:00.000Z' }),
        note({ id: 2, last_opened_date: null, updated_date: '2024-12-01T00:00:00.000Z' }),
      ];
      const result = sortItems(items, 'opened');
      expect(result[0].id).toBe(2);
    });
  });

  describe('manual', () => {
    it('sorts by position ascending', () => {
      const items = [
        note({ id: 1, position: 5 }),
        note({ id: 2, position: 1 }),
        note({ id: 3, position: 3 }),
      ];
      const result = sortItems(items, 'manual');
      expect(result.map(n => n.id)).toEqual([2, 3, 1]);
    });

    it('puts items without position at the end', () => {
      const items = [
        note({ id: 1, position: undefined }),
        note({ id: 2, position: 0 }),
      ];
      const result = sortItems(items, 'manual');
      expect(result[0].id).toBe(2);
    });
  });

  describe('unknown sortId', () => {
    it('returns items in original order', () => {
      const items = [note({ id: 3 }), note({ id: 1 }), note({ id: 2 })];
      const result = sortItems(items, 'unknown');
      expect(result.map(n => n.id)).toEqual([3, 1, 2]);
    });
  });

  it('does not mutate the original array', () => {
    const items = [note({ id: 2 }), note({ id: 1 })];
    const original = [...items];
    sortItems(items, 'name_asc');
    expect(items[0].id).toBe(original[0].id);
  });
});
