/**
 * Static HTTP Server
 *
 * Create a static file server instance to serve files
 * and folder in the './public' folder
 */

// modules
var static = require( 'node-static' ),
    port = 8080,
    http = require( 'http' ),
    DEBUG = true;

// config
var file = new static.Server( './public', {
    cache: 0,
    gzip: true
} );

var osc = require('node-osc'),
    io = require('socket.io').listen(8081);

var oscServer, oscClient;

io.sockets.on('connection', function (socket) {
  socket.on("config", function (obj) {
    console.log("config message received:", obj);
    oscServer = new osc.Server(obj.server.port, obj.server.host);
    oscClient = new osc.Client(obj.client.host, obj.client.port);

    oscClient.send('/status', 'livewriting lauhced');

    oscServer.on('message', function(msg, rinfo) {
      if(DEBUG)console.log("App says", msg);
      socket.emit("message2", msg);
    });
  });
  socket.on("message", function (obj) {
    oscClient.send(obj);
    if(DEBUG)console.log("live writing says", obj);

  });
});

// serve
http.createServer( function ( request, response ) {
    request.addListener( 'end', function () {
        file.serve( request, response );
    } ).resume();

} ).listen( port );


console.log("listening to port ",port);
