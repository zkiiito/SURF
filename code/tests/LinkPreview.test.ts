import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock redis before importing LinkPreview
vi.mock('../src/RedisClient.js', () => ({
  default: {
    get: vi.fn(),
    setEx: vi.fn(),
  },
}));

// Import after mocking
import LinkPreview from '../src/LinkPreview.js';
import redis from '../src/RedisClient.js';

describe('LinkPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getKeyByUrl', () => {
    it('should generate cache key from URL', () => {
      const key = LinkPreview.getKeyByUrl('https://example.com/page');
      
      expect(key).toBe('linkpreview-httpsexamplecompage');
    });

    it('should strip special characters', () => {
      const key = LinkPreview.getKeyByUrl('https://example.com/path?query=1&other=2');
      
      expect(key).toBe('linkpreview-httpsexamplecompathquery1other2');
    });
  });

  describe('fetchDataFromCache', () => {
    it('should return cached data when found', async () => {
      const mockData = { url: 'https://example.com', title: 'Test', image: null };
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockData));
      
      const result = await LinkPreview.fetchDataFromCache('https://example.com');
      
      expect(result).toEqual(mockData);
    });

    it('should throw when cache miss', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      
      await expect(LinkPreview.fetchDataFromCache('https://example.com'))
        .rejects.toThrow('not found');
    });
  });

  describe('saveDataToCache', () => {
    it('should save data to redis with expiration', () => {
      const data = { url: 'https://example.com', title: 'Test', image: null };
      
      LinkPreview.saveDataToCache('https://example.com', data, 3600);
      
      expect(redis.setEx).toHaveBeenCalledWith(
        'linkpreview-httpsexamplecom',
        3600,
        JSON.stringify(data)
      );
    });
  });
});
