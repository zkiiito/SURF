const got = require('got');
const contentType = require('content-type');
const iconv = require('iconv-lite');
const metascraper = require('metascraper')([
    require('metascraper-description')(),
    require('metascraper-image')(),
    require('metascraper-title')(),
]);
const redis = require('./RedisClient');
const currentQueries = {};

module.exports = {
    parse: function (url) {
        if (currentQueries[url]) {
            return currentQueries[url];
        }

        let promise = this.fetchDataFromCache(url)
            .catch(() => {
                return this.fetchData(url);
            })
            .then((result) => {
                currentQueries[url] = null;
                if (result.title) {
                    this.saveDataToCache(url, result, 3600 * 24 * 30);
                }
                return result;
            });

        currentQueries[url] = promise;
        return promise;
    },

    getKeyByUrl: function (url) {
        return 'linkpreview-' + url.replace(/[^a-z0-9]/g, '');
    },

    fetchDataFromCache: async function (url) {
        const result = await redis.get(this.getKeyByUrl(url));
        if (result === null) {
            throw new Error('not found');
        }
        return JSON.parse(result);
    },

    saveDataToCache: function (url, data, duration) {
        redis.setEx(this.getKeyByUrl(url), duration, JSON.stringify(data));
    },

    fetchData: function (url) {
        return new Promise((resolve) => {
            console.log('LinkPreview fetch: ' + url);

            const options = {
                responseType: 'buffer',
                https: {
                    rejectUnauthorized: false,
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
                }
            };

            const result = {
                url: url,
                image: null
            };

            let contenttype;
            let headerOnly = true;

            got.head(url, options)
                .catch((err) => {
                    //head not supported
                    console.log('LinkPreview head error: ' + url + ' ' + err);
                    headerOnly = false;
                    return got.get(url, options);
                })
                .then((header) => {
                    contenttype = header.headers['content-type'] ? contentType.parse(header.headers['content-type'].replace(/;+$/, '')) : {type: 'undefined'};

                    if (contenttype.type !== 'text/html') {
                        if (contenttype.type.match(/^image\//)) {
                            result.title = 'wow, it\'s an image';
                            result.image = url;
                            throw {resultReady: true};
                        }
                        throw Error('not a html document');
                    }

                    if (!headerOnly) {
                        return header;
                    }
                    return got.get(url, options);
                })
                .then((response) => {
                    const str = iconv.decode(response.body, contenttype.parameters.charset || 'utf-8');
                    return metascraper({ url, html: str });
                })
                .then((meta) => {
                    result.title = meta.title;
                    result.image = meta.image;
                    result.description = meta.description;

                    if (result.title) {
                        return resolve(result);
                    }
                })
                .catch((err) => {
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
};
