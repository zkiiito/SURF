var fs = require('fs'),
    UglifyJS = require("uglify-js");

var Minify = {
    readFiles: function(dir, done) {
        var i,l,contents = '',files = [
            "i18n.js",
            "ICanHaz.js",
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
            "view/editwave.view.js",
            "view/edituser.view.js",
            "view/disconnected.view.js",
            "view/surfapp.view.js",
            "communicator.js",
            "surf.js"
        ];
        
        for (i=0, l=files.length; i<l; i++)
        {
            contents += fs.readFileSync(dir + '/' + files[i]);
        }
        return done(null, contents);
    },
    
    minify: function() {
        var workDir = __dirname + '/../client/js',
            minFile = workDir + '/surf.min.js';
        
        if (fs.existsSync(minFile)) {   
            fs.unlinkSync(minFile);
        }
        
        this.readFiles(workDir, function(err, fileData) {
            fileData = UglifyJS.minify(fileData, {fromString: true});
            fs.writeFileSync(minFile, fileData.code);
        });
    }
};

/*
<script src="js/i18n.js"></script>
<script src="js/ICanHaz.js"></script>
<script src="js/jquery.tokeninput.js"></script>
<script src="js/date.format.js"></script>
<script src="js/phpjs.js"></script>
<script src="js/model/user.model.js"></script>
<script src="js/model/wave.model.js"></script>
<script src="js/model/message.model.js"></script>
<script src="js/model/surfapp.model.js"></script>
<script src="js/view/user.view.js"></script>
<script src="js/view/wavelist.view.js"></script>
<script src="js/view/wave.view.js"></script>
<script src="js/view/message.view.js"></script>
<script src="js/view/editwave.view.js"></script>
<script src="js/view/surfapp.view.js"></script>
<script src="js/communicator.js"></script>
<script src="js/surf.js"></script>
*/

module.exports = Minify;