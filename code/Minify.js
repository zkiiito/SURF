var fs = require('fs'),
    UglifyJS = require("uglify-js");

var Minify = {
    readFiles: function(dir, done) {
        var i,l,contents = '',files = [
            "../../node_modules/underscore/underscore.js",
            "../../node_modules/backbone/backbone.js",
            "../../node_modules/R.js/R.js",
            "i18n.js",
            "jquery.tokeninput.js",
            "date.format.js",
            "phpjs.js",
            "model/user.model.js",
            "model/wave.model.js",
            "model/message.model.js",
            "model/surfapp.model.js",
            "view/user.view.js",
            "view/wavelist.view.js",
            "view/wave.view.js",
            "view/message.view.js",
            "view/wavereplyform.view.js",
            "view/messagereplyform.view.js",
            "view/editwave.view.js",
            "view/edituser.view.js",
            "view/disconnected.view.js",
            "view/surfapp.view.js",
            "communicator.js",
            "surf.js"
        ];

        for (i=0, l=files.length; i<l; i++) {
            contents += fs.readFileSync(dir + '/' + files[i]);
        }
        return done(null, contents);
    },

    minify: function() {
        var workDir = __dirname + '/../client/js',
            minFile = workDir + '/surf.min.js',
            mapFile = workDir + '/surf.min.js.map';

        if (fs.existsSync(minFile)) {
            fs.unlinkSync(minFile);
        }

        this.readFiles(workDir, function(err, fileData) {
            if (process.env.TESTMODE) {
                fs.writeFileSync(minFile, fileData);
            } else {
                fileData = UglifyJS.minify(fileData, {fromString: true, outSourceMap: "surf.min.js.map"});
                fs.writeFileSync(minFile, fileData.code);
                //fs.writeFileSync(mapFile, fileData.map);
            }
        });
    }
};

module.exports = Minify;