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

const jsFiles = [
    'node_modules/socket.io/client-dist/socket.io.js',
    'node_modules/underscore/underscore.js',
    'node_modules/backbone/backbone.js',
    'node_modules/R.js/R.js',
    'client/js/i18n.js',
    'client/js/jquery/jquery.tokeninput.js',
    'client/js/phpjs.js',
    'client/js/randomname.js',
    'client/js/model/user.model.js',
    'client/js/model/wave.model.js',
    'client/js/model/message.model.js',
    'client/js/model/surfapp.model.js',
    'client/js/view/user.view.js',
    'client/js/view/wavelist.view.js',
    'client/js/view/wave.view.js',
    'client/js/view/message.view.js',
    'client/js/view/wavereplyform.view.js',
    'client/js/view/messagereplyform.view.js',
    'client/js/view/editwave.view.js',
    'client/js/view/edituser.view.js',
    'client/js/view/disconnected.view.js',
    'client/js/view/surfapp.view.js',
    'client/js/communicator.js',
    'client/js/surf.js'
];

const jsFilesAdmin = [
    'node_modules/underscore/underscore.js',
    'node_modules/backbone/backbone.js',
    'admin/js/lib/backbone.paginator.js',
    'admin/js/lib/bootstrap.js',
    'admin/js/lib/backgrid.js',
    'admin/js/lib/extensions/paginator/backgrid-paginator.js',
    'admin/js/lib/extensions/text-cell/backgrid-text-cell.js',
    'admin/js/admin.js',
    'admin/js/model/message.model.js',
    'admin/js/model/user.model.js',
    'admin/js/model/wave.model.js',
    'admin/js/model/waveinvite.model.js',
    'admin/js/view/user.view.js'
];

minify(readFilesToObject(jsFiles), {}).then(res => fs.writeFileSync('client/js/surf.min.js', res.code, 'utf8'));
minify(readFilesToObject(jsFilesAdmin), {}).then(res => fs.writeFileSync('admin/js/admin.min.js', res.code, 'utf8'));
