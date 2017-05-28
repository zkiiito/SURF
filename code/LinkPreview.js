const metadata = require('html-metadata');

module.exports = {
    parse: function (data) {
        return new Promise((resolve, reject) => {
            const options = {
                url: data.url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
                }
            };

            const result = {
                msgId: data.msgId,
                data: {
                    url: data.url
                }
            };

            metadata(options, function (err, meta) {
                if (err) {
                    return reject('LinkPreview error: ' + err);
                }

                if (meta.openGraph && meta.openGraph.title) {
                    result.data.title = meta.openGraph.title;
                    result.data.description = meta.openGraph.description || null;
                    result.data.image = meta.openGraph.image ? meta.openGraph.image.url : null;

                    return resolve(result);
                }

                if (meta.general && meta.general.title) {
                    result.data.title = meta.general.title;
                    result.data.description = meta.general.description || null;
                    result.data.image = null;

                    return resolve(result);
                }
            });
        });
    }
};