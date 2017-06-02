const metadata = require('html-metadata');
const redis = require('./RedisClient');

module.exports = {
    parse: function (url) {
        return this.fetchDataFromCache(url)
            .catch(() => {
                return this.fetchData(url);
            });
    },

    fetchDataFromCache: function (url) {
        return new Promise((resolve, reject) => {
            const key = 'linkpreview-' + url.replace(/[^a-z0-9]/g, '');
            redis.get(key, (err, result) => {
                if (err) {
                    console.log('LinkPreview redis error: ' + err);
                    return reject(err);
                }

                if (result === null) {
                    return reject();
                } else {
                    return resolve(JSON.parse(result));
                }
            });
        });
    },

    saveDataToCache: function (url, data) {
        const key = 'linkpreview-' + url.replace(/[^a-z0-9]/g, '');
        redis.set(key, JSON.stringify(data));
    },

    fetchData: function (url) {
        return new Promise((resolve, reject) => {
            console.log('LinkPreview fetch: ' + url);

            const options = {
                url: url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
                }
            };

            metadata(options).then((meta) => {
                const result = {
                    url: url,
                    image: null
                };

                if (meta.openGraph && meta.openGraph.title) {
                    result.title = meta.openGraph.title;
                    result.description = meta.openGraph.description || null;

                    if (meta.openGraph.image) {
                        if (Array.isArray(meta.openGraph.image)) {
                            result.image = meta.openGraph.image[0].url;
                        } else {
                            result.image = meta.openGraph.image.url;
                        }
                    }
                }

                if (meta.general && meta.general.title) {
                    result.title = meta.general.title;
                    result.description = meta.general.description || null;
                }

                if (result.title) {
                    this.saveDataToCache(url, result);
                    return resolve(result);
                }
            })
            .catch((err) => {
                return reject('LinkPreview error: ' + url + ' ' + err);
            });
        });
    }
};