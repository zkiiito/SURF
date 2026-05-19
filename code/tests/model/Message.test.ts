import { describe, it, expect, beforeEach } from 'vitest';
import { Message } from '../../src/model/Message.js';

describe('Message', () => {
  describe('constructor', () => {
    it('should create message with defaults', () => {
      const message = new Message();
      
      expect(message.userId).toBe('');
      expect(message.waveId).toBe('');
      expect(message.parentId).toBeNull();
      expect(message.message).toBe('');
      expect(message.unread).toBe(true);
      expect(message.created_at).toBeGreaterThan(0);
    });

    it('should create message with provided data', () => {
      const now = Date.now();
      const message = new Message({
        _id: 'msg123',
        userId: 'user1',
        waveId: 'wave1',
        parentId: 'parent1',
        message: 'Hello world',
        unread: false,
        created_at: now,
      });
      
      expect(message.id).toBe('msg123');
      expect(message.userId).toBe('user1');
      expect(message.waveId).toBe('wave1');
      expect(message.parentId).toBe('parent1');
      expect(message.message).toBe('Hello world');
      expect(message.unread).toBe(false);
      expect(message.created_at).toBe(now);
    });
  });

  describe('id', () => {
    it('should return empty string when no id', () => {
      const message = new Message();
      expect(message.id).toBe('');
    });

    it('should return id when set', () => {
      const message = new Message({ _id: 'test123' });
      expect(message.id).toBe('test123');
    });
  });

  describe('setId', () => {
    it('should set the id', () => {
      const message = new Message();
      message.setId('newId');
      expect(message.id).toBe('newId');
    });
  });

  describe('isNew', () => {
    it('should return true when no id', () => {
      const message = new Message();
      expect(message.isNew()).toBe(true);
    });

    it('should return false when has id', () => {
      const message = new Message({ _id: 'msg123' });
      expect(message.isNew()).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return error for empty message', () => {
      const message = new Message({ message: '' });
      expect(message.validate()).toBe('Empty message');
    });

    it('should return error for whitespace-only message', () => {
      const message = new Message({ message: '   ' });
      expect(message.validate()).toBe('Empty message');
    });

    it('should return undefined for valid message', () => {
      const message = new Message({ message: 'Hello' });
      expect(message.validate()).toBeUndefined();
    });
  });

  describe('isValid', () => {
    it('should return false for invalid message', () => {
      const message = new Message({ message: '' });
      expect(message.isValid()).toBe(false);
    });

    it('should return true for valid message', () => {
      const message = new Message({ message: 'Hello' });
      expect(message.isValid()).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should return all properties as plain object', () => {
      const now = Date.now();
      const message = new Message({
        _id: 'msg123',
        userId: 'user1',
        waveId: 'wave1',
        parentId: 'parent1',
        message: 'Hello',
        unread: true,
        created_at: now,
      });
      
      const json = message.toJSON();
      
      expect(json).toEqual({
        _id: 'msg123',
        userId: 'user1',
        waveId: 'wave1',
        parentId: 'parent1',
        message: 'Hello',
        unread: true,
        created_at: now,
      });
    });
  });
});
