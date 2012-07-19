var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs');

WebServer = http.createServer(function(req, res){
    var uri = url.parse(req.url).pathname;    
    var abspath = path.join(process.cwd(), 'client/', uri);
    //kiakad a hulyesegtol
    abspath = abspath.replace('node', '../node_modules/');

    if(req.url == '/'){
        abspath += 'index.html';
    }

    //gyorsitas: inditaskor felderiti a konyvtarat, becacheli a tartalmat
    //es csak azt szolgalja ki, aminek a neve benn a listaban
    fs.exists(abspath, function(exists){
        if(!exists){
            res.writeHead(404, {
                "Content-Type":"text/html"
            });
            res.write('<html><body>404</body></html>');
            res.end('');
            return;
        }

        fs.readFile(abspath, "binary", function(err, file){

            var filetype = path.extname(abspath);
			
            if(filetype == '.html'){
                res.writeHead(200, {
                    "Content-Type":"text/html"
                });
            } else if(filetype == '.js'){
                res.writeHead(200, {
                    "Content-Type":"text/script"
                });
            } else if(filetype == '.css'){
                res.writeHead(200, {
                    "Content-Type":"text/css"
                });
            } else{
                res.writeHead(200, {
                    "Content-Type":"text"
                });
            }
            res.write(file, "binary");
            res.end('');
        });
    });
});

exports.WebServer = WebServer;