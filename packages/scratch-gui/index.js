'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');
var host_dimensions = {};
var num_clients = {};

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8080);

var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    console.log('Client said: ', message);
    message = JSON.parse(message)
    socket.to(message["roomID"]).emit('message', JSON.stringify(message));
  });

  socket.on('create or join', function(room, dimensions=null) {
    // leave all other rooms

    log('Received request to create or join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      if (dimensions) {
        host_dimensions[room] = dimensions;
        console.log("host dim");
        console.log(host_dimensions)
      }
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);
    } else if (num_clients.hasOwnProperty(room)) {
      if (numClients < num_clients[room]) {
        log('Client ID ' + socket.id + ' joined room ' + room);
        io.sockets.in(room).emit('join', room);
        socket.join(room);
        var return_obj = {
          "room": room,
          "dim": host_dimensions[room],
          "numClients": numClients
        }
        socket.emit('joined', return_obj, socket.id);
        io.sockets.in(room).emit('ready');
      } else { // max two clients
        socket.emit('full', room);
      }
    } else { // max two clients
        log('Client ID ' + socket.id + ' joined room ' + room);
        io.sockets.in(room).emit('join', room);
        socket.join(room);
        var return_obj = {
          "room": room,
          "dim": host_dimensions[room],
          "numClients": numClients
        }
        socket.emit('joined', return_obj, socket.id);
        io.sockets.in(room).emit('ready');
    }
  });

  socket.on('set num clients', function(room, num_clients_num) {
    // leave all other rooms

    console.log('Received request to change num clients in  ' + room + " to " + num_clients_num);
    num_clients[room] = num_clients_num

  });
  socket.on('leave', function(room) {
    console.log("socket id " + socket.id + " leaving room with id " + room);
    socket.leave(room);
  });


  socket.on('joinnew', function(room) {
    // leave all other rooms

    console.log('Received request to create or join room ' + room);
    var clientsInRoom = io.sockets.adapter.rooms[room];
    console.log(clientsInRoom)
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    console.log('Room ' + room + ' now has ' + numClients + ' client(s)');
    console.log('Client ID ' + socket.id + ' joined room ' + room);
    socket.join(room);
    io.sockets.in(room).emit('joinednew', room);
    io.sockets.in(room).emit('ready');
  });
  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

});
