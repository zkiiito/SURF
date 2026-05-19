import { describe, it, expect, beforeEach, vi } from 'vitest';
import { User } from '../../src/model/User.js';

// Mock dynamic imports to avoid loading actual dependencies
vi.mock('../../src/DAL.js', () => ({
  default: {
    saveUser: vi.fn(),
  },
}));

vi.mock('../../src/SurfServer.js', () => ({
  default: {
    users: { get: vi.fn() },
    waves: { get: vi.fn() },
  },
}));

describe('User', () => {
  describe('constructor', () => {
    it('should create user with defaults', () => {
      const user = new User();
      
      expect(user.name).toBe('');
      expect(user.avatar).toBe('');
      expect(user.status).toBe('offline');
      expect(user.email).toBe('');
      expect(user.googleId).toBe('');
      expect(user.googleAvatar).toBe('');
      expect(user.socket).toBeNull();
      expect(user.waves.length).toBe(0);
    });

    it('should create user with provided data', () => {
      const user = new User({
        _id: 'user123',
        name: 'John Doe',
        avatar: 'avatar.jpg',
        status: 'online',
        email: 'john@example.com',
        googleId: 'google123',
        googleAvatar: 'google-avatar.jpg',
      });
      
      expect(user.id).toBe('user123');
      expect(user.name).toBe('John Doe');
      expect(user.avatar).toBe('avatar.jpg');
      expect(user.status).toBe('online');
      expect(user.email).toBe('john@example.com');
      expect(user.googleId).toBe('google123');
      expect(user.googleAvatar).toBe('google-avatar.jpg');
    });
  });

  describe('id', () => {
    it('should return empty string when no id', () => {
      const user = new User();
      expect(user.id).toBe('');
    });

    it('should return id when set', () => {
      const user = new User({ _id: 'user123' });
      expect(user.id).toBe('user123');
    });
  });

  describe('setId', () => {
    it('should set the id', () => {
      const user = new User();
      user.setId('newId');
      expect(user.id).toBe('newId');
    });
  });

  describe('isNew', () => {
    it('should return true when no id', () => {
      const user = new User();
      expect(user.isNew()).toBe(true);
    });

    it('should return false when has id', () => {
      const user = new User({ _id: 'user123' });
      expect(user.isNew()).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return error for empty name', () => {
      const user = new User({ name: '', avatar: 'pic.jpg' });
      expect(user.validate()).toBe('Empty name');
    });

    it('should return error for empty avatar', () => {
      const user = new User({ name: 'John', avatar: '' });
      expect(user.validate()).toBe('Empty avatar');
    });

    it('should return undefined for valid user', () => {
      const user = new User({ name: 'John', avatar: 'pic.jpg' });
      expect(user.validate()).toBeUndefined();
    });

    it('should validate provided attrs instead of user properties', () => {
      const user = new User({ name: 'John', avatar: 'pic.jpg' });
      expect(user.validate({ name: '', avatar: 'pic.jpg' })).toBe('Empty name');
    });
  });

  describe('isValid', () => {
    it('should return false for invalid user', () => {
      const user = new User({ name: '', avatar: 'pic.jpg' });
      expect(user.isValid()).toBe(false);
    });

    it('should return true for valid user', () => {
      const user = new User({ name: 'John', avatar: 'pic.jpg' });
      expect(user.isValid()).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should return all properties as plain object', () => {
      const user = new User({
        _id: 'user123',
        name: 'John Doe',
        avatar: 'avatar.jpg',
        status: 'online',
        email: 'john@example.com',
        googleId: 'google123',
        googleAvatar: 'google-avatar.jpg',
      });
      
      const json = user.toJSON();
      
      expect(json).toEqual({
        _id: 'user123',
        name: 'John Doe',
        avatar: 'avatar.jpg',
        status: 'online',
        email: 'john@example.com',
        googleId: 'google123',
        googleAvatar: 'google-avatar.jpg',
      });
    });
  });

  describe('toFilteredJSON', () => {
    it('should mask email address', () => {
      const user = new User({
        _id: 'user123',
        name: 'John Doe',
        avatar: 'avatar.jpg',
        status: 'online',
        email: 'john@example.com',
        googleId: 'google123',
        googleAvatar: 'google-avatar.jpg',
      });
      
      const filtered = user.toFilteredJSON();
      
      expect(filtered.email).toBe('jo..@example.com');
    });

    it('should include only public properties', () => {
      const user = new User({
        _id: 'user123',
        name: 'John Doe',
        avatar: 'avatar.jpg',
        status: 'online',
        email: 'john@example.com',
        googleId: 'google123',
        googleAvatar: 'google-avatar.jpg',
      });
      
      const filtered = user.toFilteredJSON();
      
      expect(Object.keys(filtered).sort()).toEqual(['_id', 'avatar', 'email', 'id', 'name', 'status']);
      expect(filtered).not.toHaveProperty('googleId');
      expect(filtered).not.toHaveProperty('googleAvatar');
    });

    it('should include id and _id as same value', () => {
      const user = new User({ _id: 'user123', email: 'test@test.com' });
      const filtered = user.toFilteredJSON();
      
      expect(filtered.id).toBe('user123');
      expect(filtered._id).toBe('user123');
    });
  });

  describe('toSelfJSON', () => {
    it('should include emailMD5 hash', () => {
      const user = new User({
        _id: 'user123',
        name: 'John Doe',
        avatar: 'avatar.jpg',
        email: 'john@example.com',
      });
      
      const selfJson = user.toSelfJSON();
      
      expect(selfJson.emailMD5).toBeDefined();
      expect(selfJson.emailMD5).toHaveLength(32); // MD5 hash is 32 hex chars
    });

    it('should include all user properties', () => {
      const user = new User({
        _id: 'user123',
        name: 'John Doe',
        avatar: 'avatar.jpg',
        email: 'john@example.com',
        googleId: 'google123',
        googleAvatar: 'google-avatar.jpg',
      });
      
      const selfJson = user.toSelfJSON();
      
      expect(selfJson.googleId).toBe('google123');
      expect(selfJson.googleAvatar).toBe('google-avatar.jpg');
      expect(selfJson.email).toBe('john@example.com'); // Full email, not masked
    });
  });

  describe('send', () => {
    it('should emit to socket when socket exists', () => {
      const user = new User({ _id: 'user123' });
      const mockEmit = vi.fn();
      user.socket = { emit: mockEmit } as any;
      
      user.send('testEvent', { data: 'test' });
      
      expect(mockEmit).toHaveBeenCalledWith('testEvent', { data: 'test' });
    });

    it('should not throw when socket is null', () => {
      const user = new User({ _id: 'user123' });
      
      expect(() => user.send('testEvent', {})).not.toThrow();
    });
  });
});
