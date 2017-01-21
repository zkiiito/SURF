var net = require('net'),
    Config = require('./Config'),
    socket;

var GraphiteClient = {
    track: function (key, value) {
        if (Config.graphiteKey) {
            socket = net.createConnection(2003, "carbon.hostedgraphite.com", function () {
                socket.write(Config.graphiteKey + key + ' ' + value + '\n');
                socket.end();
            });
        }
    }
};

module.exports = GraphiteClient;