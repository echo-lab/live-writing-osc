/**
 * Static HTTP Server
 *
 * Create a static file server instance to serve files
 * and folder in the './public' folder
 */

// modules
var static = require( 'node-static' ),
    port = 8080,
    http = require( 'http' );

// config
var file = new static.Server( './public', {
    cache: 3600,
    gzip: true
} );

var osc = require('node-osc'),
    io = require('socket.io').listen(8081);

var oscServer, oscClient;

io.sockets.on('connection', function (socket) {
  socket.on("config", function (obj) {
    oscServer = new osc.Server(obj.server.port, obj.server.host);
    oscClient = new osc.Client(obj.client.host, obj.client.port);

    oscClient.send('/status', socket.sessionId + ' connected');

    oscServer.on('message', function(msg, rinfo) {
      console.log(msg, rinfo);
      socket.emit("message", msg);
    });
  });
  socket.on("message", function (obj) {
    oscClient.send(obj);
  });
});

// serve
http.createServer( function ( request, response ) {
    request.addListener( 'end', function () {
        file.serve( request, response );
    } ).resume();

} ).listen( port );


console.log("listening to port ",port);
