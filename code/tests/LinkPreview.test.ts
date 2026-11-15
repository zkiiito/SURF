import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/MongooseModels.js', () => ({
  LinkPreviewCacheModel: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));

import LinkPreview from '../src/LinkPreview.js';
import { LinkPreviewCacheModel } from '../src/MongooseModels.js';

describe('LinkPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchDataFromCache', () => {
    it('should return cached data when found', async () => {
      const cached = { url: 'https://example.com', title: 'Test', image: null };
      vi.mocked(LinkPreviewCacheModel.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue({ url: 'https://example.com', data: cached }),
      } as never);

      const result = await LinkPreview.fetchDataFromCache('https://example.com');

      expect(result).toEqual(cached);
      expect(LinkPreviewCacheModel.findOne).toHaveBeenCalledWith({ url: 'https://example.com' });
    });

    it('should throw when cache miss', async () => {
      vi.mocked(LinkPreviewCacheModel.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      } as never);

      await expect(LinkPreview.fetchDataFromCache('https://example.com'))
        .rejects.toThrow('not found');
    });
  });

  describe('saveDataToCache', () => {
    it('should upsert with expiresAt derived from duration', () => {
      const data = { url: 'https://example.com', title: 'Test', image: null };
      vi.mocked(LinkPreviewCacheModel.updateOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue(undefined),
      } as never);

      const before = Date.now();
      LinkPreview.saveDataToCache('https://example.com', data, 3600);
      const after = Date.now();

      expect(LinkPreviewCacheModel.updateOne).toHaveBeenCalledTimes(1);
      const [filter, update, opts] = vi.mocked(LinkPreviewCacheModel.updateOne).mock.calls[0];
      expect(filter).toEqual({ url: 'https://example.com' });
      expect(opts).toEqual({ upsert: true });
      const u = update as { url: string; data: typeof data; expiresAt: Date };
      expect(u.url).toBe('https://example.com');
      expect(u.data).toEqual(data);
      expect(u.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3600 * 1000);
      expect(u.expiresAt.getTime()).toBeLessThanOrEqual(after + 3600 * 1000);
    });
  });
});
