// Setup basic express server
var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var xmlrpc = require('xmlrpc');
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

var logger = require('log4js').getLogger();

var cliOps = {
                host: 'd.hatena.ne.jp',
                path: '/xmlrpc',
    };

var client = xmlrpc.createClient(cliOps);

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));


io.on('connection', function (socket) {
  var addedUser = false;

  // first search similar word
  socket.on('first search', function(data) {
    client.methodCall('hatena.getSimilarWord',
    [{
      'wordlist' : [ data ]
    }],
    function(error, value) {
      if(error) {
          logger.info(error);
          logger.info(error.req && error.req._header);
          logger.info(error.res && error.res.statusCode);
          logger.info(error.body);
          socket.emit('search result', {
            result: error
          });
          return;
      }
      socket.emit('first search result', {
        result: value,
        word: data
      });
    });
  });

  // search similar word
  socket.on('search', function(data) {
    client.methodCall('hatena.getSimilarWord',
    [{
      'wordlist' : [ data.name ]
    }],
    function(error, value) {
      if(error) {
          logger.info(error);
          logger.info(error.req && error.req._header);
          logger.info(error.res && error.res.statusCode);
          logger.info(error.body);
          socket.emit('search result', {
            result: error
          });
          return;
      }
      socket.emit('search result', {
        result: value,
        node: data
      });
    });
  });
});
