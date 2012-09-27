var fs = require('fs'),
    jsp = require("uglify-js").parser,
    pro = require("uglify-js").uglify;

Minify = {
    readFiles: function(dir, done) {
        var contents = '';
        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            var i = 0;
            (function next() {
                i += 1;
                var file = list[i];
                if (!file) {
                    return done(null, contents);
                }
                file = dir + '/' + file;
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        Minify.readFiles(file, function(err, res) {
                            contents += res;
                            next();
                        });
                    } else {
                        contents += fs.readFileSync(file);
                        next();
                    }
                });
            }());
        });
    },
    
    compress: function(fileData)
    {
        var ast = jsp.parse(fileData);
        ast = pro.ast_mangle(ast); // get a new AST with mangled names
        ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
        return pro.gen_code(ast); // compressed code here        
    },
    
    minify: function(callback) {
        var workDir = __dirname + '/../client/js',
            minFile = workDir + '/surf.min.js';
        
        if (fs.existsSync(minFile)) {   
            fs.unlinkSync(minFile);
        }
        Minify.readFiles(workDir, function(err, fileData) {
            var compressedData = Minify.compress(fileData);
            fs.writeFileSync(minFile, compressedData);
        });
    }
};

exports.Minify = Minify;