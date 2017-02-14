const net = require('net'),
    Config = require('./Config');

const GraphiteClient = {
    track: function (key, value) {
        if (Config.graphiteKey) {
            const socket = net.createConnection(2003, 'carbon.hostedgraphite.com', () => {
                socket.write(Config.graphiteKey + key + ' ' + value + '\n', 'UTF8', () => {
                    socket.end();
                });
            });
        }
    }
};

module.exports = GraphiteClient;