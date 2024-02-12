/* eslint-env node */
const fs = require('fs');
const { minify } = require('terser');

function readFilesToObject(files) {
    return files.reduce((obj, file) => {
        console.log(file);
        obj[file] = fs.readFileSync(file, 'utf8');
        return obj;
    }, {});
}

const jsFilesAdmin = [
    'node_modules/underscore/underscore.js',
    'node_modules/backbone/backbone.js',
    'src/lib/backbone.paginator.js',
    'src/lib/bootstrap.js',
    'src/lib/backgrid.js',
    'src/lib/extensions/paginator/backgrid-paginator.js',
    'src/lib/extensions/text-cell/backgrid-text-cell.js',
    'src/admin.js',
    'src/model/message.model.js',
    'src/model/user.model.js',
    'src/model/wave.model.js',
    'src/model/waveinvite.model.js',
    'src/view/user.view.js'
];

minify(readFilesToObject(jsFilesAdmin), {}).then(res => fs.writeFileSync('public/js/admin.min.js', res.code, 'utf8'));
