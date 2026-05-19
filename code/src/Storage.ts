import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import Config from './Config.js';

class LocalDiskStorage {
  get uploadDir(): string {
    return Config.uploadDir;
  }

  pathFor(waveId: string, storageKey: string): string {
    return path.join(this.uploadDir, waveId, storageKey);
  }

  async ensureWaveDir(waveId: string): Promise<string> {
    const dir = path.join(this.uploadDir, waveId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  generateKey(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async exists(waveId: string, storageKey: string): Promise<boolean> {
    try {
      await fs.access(this.pathFor(waveId, storageKey));
      return true;
    } catch {
      return false;
    }
  }

  async delete(waveId: string, storageKey: string): Promise<void> {
    try {
      await fs.unlink(this.pathFor(waveId, storageKey));
    } catch {
      // ignore
    }
  }
}

const Storage = new LocalDiskStorage();
export default Storage;
export { LocalDiskStorage };
