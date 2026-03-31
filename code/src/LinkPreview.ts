import got from 'got';
import { parse as parseContentType } from 'content-type';
import iconv from 'iconv-lite';
import metascraper from 'metascraper';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperTitle from 'metascraper-title';
import redis from './RedisClient.js';
import type { LinkPreviewResult } from './types.js';

const metascraperInstance = metascraper([
  metascraperDescription(),
  metascraperImage(),
  metascraperTitle(),
]);

/**
 * Service for fetching and caching link preview metadata
 */
class LinkPreviewService {
  private currentQueries: Record<string, Promise<LinkPreviewResult> | null> = {};

  /**
   * Parse a URL and return preview data (with caching)
   */
  parse(url: string): Promise<LinkPreviewResult> {
    if (this.currentQueries[url]) {
      return this.currentQueries[url]!;
    }

    const promise = this.fetchDataFromCache(url)
      .catch(() => this.fetchData(url))
      .then((result) => {
        this.currentQueries[url] = null;
        if (result.title) {
          this.saveDataToCache(url, result, 3600 * 24 * 30);
        }
        return result;
      });

    this.currentQueries[url] = promise;
    return promise;
  }

  /**
   * Generate cache key from URL
   */
  getKeyByUrl(url: string): string {
    return 'linkpreview-' + url.replace(/[^a-z0-9]/gi, '');
  }

  /**
   * Fetch preview data from cache
   */
  async fetchDataFromCache(url: string): Promise<LinkPreviewResult> {
    const result = await redis.get(this.getKeyByUrl(url));
    if (result === null) {
      throw new Error('not found');
    }
    return JSON.parse(result) as LinkPreviewResult;
  }

  /**
   * Save preview data to cache
   */
  saveDataToCache(url: string, data: LinkPreviewResult, duration: number): void {
    redis.setEx(this.getKeyByUrl(url), duration, JSON.stringify(data));
  }

  /**
   * Fetch preview data from the URL
   */
  fetchData(url: string): Promise<LinkPreviewResult> {
    return new Promise((resolve) => {
      console.log('LinkPreview fetch: ' + url);

      const options = {
        responseType: 'buffer' as const,
        https: {
          rejectUnauthorized: false,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
        },
      };

      const result: LinkPreviewResult = {
        url,
        image: null,
      };

      interface ContentType {
        type: string;
        parameters: Record<string, string>;
      }

      let contenttype: ContentType;
      let headerOnly = true;

      got.head(url, options)
        .catch((err: Error) => {
          // HEAD not supported
          console.log('LinkPreview head error: ' + url + ' ' + err);
          headerOnly = false;
          return got.get(url, options);
        })
        .then((header) => {
          const rawContentType = header.headers['content-type'];
          contenttype = rawContentType
            ? parseContentType(rawContentType.replace(/;+$/, ''))
            : { type: 'undefined', parameters: {} };

          if (contenttype.type !== 'text/html') {
            if (contenttype.type.match(/^image\//)) {
              result.title = "wow, it's an image";
              result.image = url;
              throw { resultReady: true };
            }
            throw new Error('not a html document');
          }

          if (!headerOnly) {
            return header;
          }
          return got.get(url, options);
        })
        .then((response) => {
          const str = iconv.decode(
            response.body as Buffer,
            contenttype.parameters.charset || 'utf-8'
          );
          return metascraperInstance({ url, html: str });
        })
        .then((meta) => {
          result.title = meta.title ?? undefined;
          result.image = meta.image ?? null;
          result.description = meta.description ?? null;

          if (result.title) {
            return resolve(result);
          }
        })
        .catch((err: Error & { resultReady?: boolean }) => {
          if (err.resultReady) {
            return resolve(result);
          }

          console.log('LinkPreview error: ' + url + ' ' + err);

          result.title = err.toString();
          result.description = null;
          return resolve(result);
        });
    });
  }
}

// Export singleton instance
const LinkPreview = new LinkPreviewService();
export default LinkPreview;

// Also export the class for testing purposes
export { LinkPreviewService };
