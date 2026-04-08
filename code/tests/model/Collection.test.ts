import { describe, it, expect, beforeEach } from 'vitest';
import { Collection, Identifiable } from '../../src/model/Collection.js';

interface TestItem extends Identifiable {
  id: string;
  name: string;
  value: number;
}

describe('Collection', () => {
  let collection: Collection<TestItem>;

  beforeEach(() => {
    collection = new Collection<TestItem>();
  });

  describe('add', () => {
    it('should add a single item', () => {
      const item: TestItem = { id: '1', name: 'Item 1', value: 10 };
      collection.add(item);
      
      expect(collection.length).toBe(1);
      expect(collection.get('1')).toBe(item);
    });

    it('should add multiple items at once', () => {
      const items: TestItem[] = [
        { id: '1', name: 'Item 1', value: 10 },
        { id: '2', name: 'Item 2', value: 20 },
      ];
      collection.add(items);
      
      expect(collection.length).toBe(2);
    });

    it('should overwrite existing item with same id', () => {
      collection.add({ id: '1', name: 'Original', value: 10 });
      collection.add({ id: '1', name: 'Updated', value: 20 });
      
      expect(collection.length).toBe(1);
      expect(collection.get('1')?.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should remove an item', () => {
      const item: TestItem = { id: '1', name: 'Item 1', value: 10 };
      collection.add(item);
      collection.remove(item);
      
      expect(collection.length).toBe(0);
      expect(collection.get('1')).toBeUndefined();
    });
  });

  describe('get', () => {
    it('should return item by id', () => {
      const item: TestItem = { id: '1', name: 'Item 1', value: 10 };
      collection.add(item);
      
      expect(collection.get('1')).toBe(item);
    });

    it('should return undefined for non-existent id', () => {
      expect(collection.get('nonexistent')).toBeUndefined();
    });
  });

  describe('contains', () => {
    it('should return true if item exists', () => {
      const item: TestItem = { id: '1', name: 'Item 1', value: 10 };
      collection.add(item);
      
      expect(collection.contains(item)).toBe(true);
    });

    it('should return false if item does not exist', () => {
      const item: TestItem = { id: '1', name: 'Item 1', value: 10 };
      
      expect(collection.contains(item)).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true if id exists', () => {
      collection.add({ id: '1', name: 'Item 1', value: 10 });
      
      expect(collection.has('1')).toBe(true);
    });

    it('should return false if id does not exist', () => {
      expect(collection.has('1')).toBe(false);
    });
  });

  describe('find', () => {
    it('should find item matching predicate', () => {
      collection.add([
        { id: '1', name: 'Alice', value: 10 },
        { id: '2', name: 'Bob', value: 20 },
      ]);
      
      const found = collection.find(item => item.name === 'Bob');
      expect(found?.id).toBe('2');
    });

    it('should return undefined if no match', () => {
      collection.add({ id: '1', name: 'Alice', value: 10 });
      
      const found = collection.find(item => item.name === 'Bob');
      expect(found).toBeUndefined();
    });
  });

  describe('filter', () => {
    it('should filter items matching predicate', () => {
      collection.add([
        { id: '1', name: 'A', value: 10 },
        { id: '2', name: 'B', value: 20 },
        { id: '3', name: 'C', value: 30 },
      ]);
      
      const filtered = collection.filter(item => item.value > 15);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(i => i.id)).toEqual(['2', '3']);
    });
  });

  describe('each', () => {
    it('should iterate over all items', () => {
      collection.add([
        { id: '1', name: 'A', value: 10 },
        { id: '2', name: 'B', value: 20 },
      ]);
      
      const names: string[] = [];
      collection.each(item => names.push(item.name));
      
      expect(names).toEqual(['A', 'B']);
    });
  });

  describe('indexOf', () => {
    it('should return index of item', () => {
      const item1: TestItem = { id: '1', name: 'A', value: 10 };
      const item2: TestItem = { id: '2', name: 'B', value: 20 };
      collection.add([item1, item2]);
      
      expect(collection.indexOf(item1)).toBe(0);
      expect(collection.indexOf(item2)).toBe(1);
    });

    it('should return -1 for non-existent item', () => {
      const item: TestItem = { id: '1', name: 'A', value: 10 };
      expect(collection.indexOf(item)).toBe(-1);
    });
  });

  describe('reset', () => {
    it('should clear and add new items', () => {
      collection.add({ id: '1', name: 'Old', value: 10 });
      
      collection.reset([
        { id: '2', name: 'New1', value: 20 },
        { id: '3', name: 'New2', value: 30 },
      ]);
      
      expect(collection.length).toBe(2);
      expect(collection.get('1')).toBeUndefined();
      expect(collection.get('2')?.name).toBe('New1');
    });
  });

  describe('toArray', () => {
    it('should return all items as array', () => {
      collection.add([
        { id: '1', name: 'A', value: 10 },
        { id: '2', name: 'B', value: 20 },
      ]);
      
      const arr = collection.toArray();
      expect(arr).toHaveLength(2);
      expect(arr[0].id).toBe('1');
    });
  });

  describe('reduce', () => {
    it('should reduce items to single value', () => {
      collection.add([
        { id: '1', name: 'A', value: 10 },
        { id: '2', name: 'B', value: 20 },
        { id: '3', name: 'C', value: 30 },
      ]);
      
      const sum = collection.reduce((acc, item) => acc + item.value, 0);
      expect(sum).toBe(60);
    });
  });

  describe('map', () => {
    it('should map items to new values', () => {
      collection.add([
        { id: '1', name: 'A', value: 10 },
        { id: '2', name: 'B', value: 20 },
      ]);
      
      const names = collection.map(item => item.name);
      expect(names).toEqual(['A', 'B']);
    });
  });

  describe('length', () => {
    it('should return correct count', () => {
      expect(collection.length).toBe(0);
      
      collection.add({ id: '1', name: 'A', value: 10 });
      expect(collection.length).toBe(1);
      
      collection.add({ id: '2', name: 'B', value: 20 });
      expect(collection.length).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all items', () => {
      collection.add([
        { id: '1', name: 'A', value: 10 },
        { id: '2', name: 'B', value: 20 },
      ]);
      
      collection.clear();
      expect(collection.length).toBe(0);
    });
  });

  describe('iterator', () => {
    it('should be iterable with for...of', () => {
      collection.add([
        { id: '1', name: 'A', value: 10 },
        { id: '2', name: 'B', value: 20 },
      ]);
      
      const items: TestItem[] = [];
      for (const item of collection) {
        items.push(item);
      }
      
      expect(items).toHaveLength(2);
    });
  });
});
