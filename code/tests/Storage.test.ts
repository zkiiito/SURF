import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import Config from '../src/Config.js';
import Storage from '../src/Storage.js';

describe('Storage (local disk)', () => {
  let tmpRoot: string;
  let originalUploadDir: string;

  beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'surf-storage-test-'));
    originalUploadDir = Config.uploadDir;
    Config.uploadDir = tmpRoot;
  });

  afterAll(async () => {
    Config.uploadDir = originalUploadDir;
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('generates unique storage keys', () => {
    const keys = new Set(Array.from({ length: 100 }, () => Storage.generateKey()));
    expect(keys.size).toBe(100);
    for (const k of keys) {
      expect(k).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it('creates wave directory on ensureWaveDir', async () => {
    const dir = await Storage.ensureWaveDir('wave-A');
    expect(dir).toBe(path.join(tmpRoot, 'wave-A'));
    const stat = await fs.stat(dir);
    expect(stat.isDirectory()).toBe(true);
  });

  it('round-trips a file: write, exists, delete', async () => {
    const waveId = 'wave-B';
    const key = Storage.generateKey();
    await Storage.ensureWaveDir(waveId);
    const filePath = Storage.pathFor(waveId, key);

    await fs.writeFile(filePath, 'hello world');

    expect(await Storage.exists(waveId, key)).toBe(true);
    const contents = await fs.readFile(filePath, 'utf-8');
    expect(contents).toBe('hello world');

    await Storage.delete(waveId, key);
    expect(await Storage.exists(waveId, key)).toBe(false);
  });

  it('delete on missing file is a no-op', async () => {
    await expect(Storage.delete('wave-C', 'does-not-exist')).resolves.toBeUndefined();
  });

  it('pathFor namespaces files under wave id', () => {
    expect(Storage.pathFor('wave-X', 'foo')).toBe(path.join(tmpRoot, 'wave-X', 'foo'));
    expect(Storage.pathFor('wave-Y', 'foo')).toBe(path.join(tmpRoot, 'wave-Y', 'foo'));
  });
});
