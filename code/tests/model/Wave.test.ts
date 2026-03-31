import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Wave } from '../../src/model/Wave.js';
import { User } from '../../src/model/User.js';

// Mock dynamic imports
vi.mock('../../src/DAL.js', () => ({
  default: {
    saveWave: vi.fn(),
    addUnreadMessage: vi.fn(),
  },
}));

vi.mock('../../src/SurfServer.js', () => ({
  default: {
    users: { get: vi.fn() },
    waves: { get: vi.fn() },
  },
}));

describe('Wave', () => {
  describe('constructor', () => {
    it('should create wave with defaults', () => {
      const wave = new Wave();
      
      expect(wave.title).toBe('');
      expect(wave.userIds).toEqual([]);
      expect(wave.users.length).toBe(0);
    });

    it('should create wave with provided data', () => {
      const wave = new Wave({
        _id: 'wave123',
        title: 'Test Wave',
        userIds: ['user1', 'user2'],
      });
      
      expect(wave.id).toBe('wave123');
      expect(wave.title).toBe('Test Wave');
      expect(wave.userIds).toEqual(['user1', 'user2']);
    });
  });

  describe('id', () => {
    it('should return empty string when no id', () => {
      const wave = new Wave();
      expect(wave.id).toBe('');
    });

    it('should return id when set', () => {
      const wave = new Wave({ _id: 'wave123' });
      expect(wave.id).toBe('wave123');
    });
  });

  describe('setId', () => {
    it('should set the id', () => {
      const wave = new Wave();
      wave.setId('newId');
      expect(wave.id).toBe('newId');
    });
  });

  describe('isNew', () => {
    it('should return true when no id', () => {
      const wave = new Wave();
      expect(wave.isNew()).toBe(true);
    });

    it('should return false when has id', () => {
      const wave = new Wave({ _id: 'wave123' });
      expect(wave.isNew()).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return error for empty title', () => {
      const wave = new Wave({ title: '' });
      expect(wave.validate()).toBe('Empty name');
    });

    it('should return error for whitespace-only title', () => {
      const wave = new Wave({ title: '   ' });
      expect(wave.validate()).toBe('Empty name');
    });

    it('should return undefined for valid wave', () => {
      const wave = new Wave({ title: 'Test Wave' });
      expect(wave.validate()).toBeUndefined();
    });
  });

  describe('isValid', () => {
    it('should return false for invalid wave', () => {
      const wave = new Wave({ title: '' });
      expect(wave.isValid()).toBe(false);
    });

    it('should return true for valid wave', () => {
      const wave = new Wave({ title: 'Test Wave' });
      expect(wave.isValid()).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should return all properties as plain object', () => {
      const wave = new Wave({
        _id: 'wave123',
        title: 'Test Wave',
        userIds: ['user1', 'user2'],
      });
      
      const json = wave.toJSON();
      
      expect(json).toEqual({
        _id: 'wave123',
        title: 'Test Wave',
        userIds: ['user1', 'user2'],
      });
    });
  });

  describe('addUser', () => {
    it('should add user to wave', () => {
      const wave = new Wave({ _id: 'wave123', title: 'Test' });
      const user = new User({ _id: 'user123', name: 'John', avatar: 'pic.jpg' });
      
      wave.addUser(user, false);
      
      expect(wave.users.contains(user)).toBe(true);
      expect(wave.userIds).toContain('user123');
    });

    it('should add wave to user', () => {
      const wave = new Wave({ _id: 'wave123', title: 'Test' });
      const user = new User({ _id: 'user123', name: 'John', avatar: 'pic.jpg' });
      
      wave.addUser(user, false);
      
      expect(user.waves.contains(wave)).toBe(true);
    });

    it('should not duplicate user id', () => {
      const wave = new Wave({ _id: 'wave123', title: 'Test', userIds: ['user123'] });
      const user = new User({ _id: 'user123', name: 'John', avatar: 'pic.jpg' });
      
      wave.addUser(user, false);
      
      expect(wave.userIds.filter(id => id === 'user123')).toHaveLength(1);
    });
  });

  describe('isMember', () => {
    it('should return true if user is member', () => {
      const wave = new Wave({ _id: 'wave123', title: 'Test' });
      const user = new User({ _id: 'user123', name: 'John', avatar: 'pic.jpg' });
      
      wave.addUser(user, false);
      
      expect(wave.isMember(user)).toBe(true);
    });

    it('should return false if user is not member', () => {
      const wave = new Wave({ _id: 'wave123', title: 'Test' });
      const user = new User({ _id: 'user123', name: 'John', avatar: 'pic.jpg' });
      
      expect(wave.isMember(user)).toBe(false);
    });
  });

  describe('notifyUsers', () => {
    it('should send updateWave to all users', () => {
      const wave = new Wave({ _id: 'wave123', title: 'Test' });
      const user1 = new User({ _id: 'user1', name: 'John', avatar: 'pic.jpg', email: 'a@b.com' });
      const user2 = new User({ _id: 'user2', name: 'Jane', avatar: 'pic.jpg', email: 'c@d.com' });
      
      const emit1 = vi.fn();
      const emit2 = vi.fn();
      user1.socket = { emit: emit1 } as any;
      user2.socket = { emit: emit2 } as any;
      
      wave.addUser(user1, false);
      wave.addUser(user2, false);
      
      wave.notifyUsers();
      
      expect(emit1).toHaveBeenCalledWith('updateWave', { wave: wave.toJSON() });
      expect(emit2).toHaveBeenCalledWith('updateWave', { wave: wave.toJSON() });
    });
  });
});
