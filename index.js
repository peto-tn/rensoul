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

// Chatroom

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;

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


  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    // we store the username in the socket session for this client
    socket.username = username;
    // add the client's username to the global list
    usernames[username] = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
