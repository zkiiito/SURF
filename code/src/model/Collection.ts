/**
 * A generic typed collection class that replaces Backbone.Collection
 * Provides similar API for managing collections of model instances
 */
export interface Identifiable {
  id: string;
}

export class Collection<T extends Identifiable> {
  private items = new Map<string, T>();

  /**
   * Add one or more items to the collection
   */
  add(item: T | T[]): void {
    if (Array.isArray(item)) {
      for (const i of item) {
        this.items.set(i.id, i);
      }
    } else {
      this.items.set(item.id, item);
    }
  }

  /**
   * Remove an item from the collection
   */
  remove(item: T): void {
    this.items.delete(item.id);
  }

  /**
   * Get an item by its ID
   */
  get(id: string): T | undefined {
    return this.items.get(id);
  }

  /**
   * Check if the collection contains an item
   */
  contains(item: T): boolean {
    return this.items.has(item.id);
  }

  /**
   * Check if an item with the given ID exists
   */
  has(id: string): boolean {
    return this.items.has(id);
  }

  /**
   * Find an item matching a predicate
   */
  find(predicate: (item: T) => boolean): T | undefined {
    for (const item of this.items.values()) {
      if (predicate(item)) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Filter items matching a predicate
   */
  filter(predicate: (item: T) => boolean): T[] {
    const result: T[] = [];
    for (const item of this.items.values()) {
      if (predicate(item)) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Iterate over all items
   */
  each(callback: (item: T) => void): void {
    for (const item of this.items.values()) {
      callback(item);
    }
  }

  /**
   * Get the index of an item (for compatibility)
   * Returns -1 if not found
   */
  indexOf(item: T): number {
    const arr = this.toArray();
    return arr.indexOf(item);
  }

  /**
   * Reset the collection with new items
   */
  reset(items: Array<T | Partial<T & { _id?: string }>>): void {
    this.items.clear();
    for (const item of items) {
      // Handle items that might have _id instead of id
      const id = (item as T).id ?? (item as { _id?: string })._id;
      if (id) {
        this.items.set(id, item as T);
      }
    }
  }

  /**
   * Convert to array
   */
  toArray(): T[] {
    return Array.from(this.items.values());
  }

  /**
   * Reduce the collection
   */
  reduce<U>(callback: (accumulator: U, item: T) => U, initial: U): U {
    let acc = initial;
    for (const item of this.items.values()) {
      acc = callback(acc, item);
    }
    return acc;
  }

  /**
   * Map over items
   */
  map<U>(callback: (item: T) => U): U[] {
    const result: U[] = [];
    for (const item of this.items.values()) {
      result.push(callback(item));
    }
    return result;
  }

  /**
   * Get collection length
   */
  get length(): number {
    return this.items.size;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items.clear();
  }

  /**
   * Get iterator for values
   */
  [Symbol.iterator](): Iterator<T> {
    return this.items.values();
  }
}
