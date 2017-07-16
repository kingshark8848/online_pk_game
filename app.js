const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var shortid = require('shortid');
var app_url = 'http://localhost';
var port = 3000;

// serve staic file
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
})

http.listen(port, function () {
  console.log('Example app listening on port '+port+'!');
})

SOCKET_LIST = {};

io.on('connection', function(socket){
  console.log('a user connected');

  socket.id = shortid.generate();
  socket.name = socket.id;
  socket.img_url = app_url + ":" + port + '/img/avatar/1.jpg';
  SOCKET_LIST[socket.id] = socket;

  // send socket info to client
  socket.emit('init_user', get_user(socket));


  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
})

function get_user(socket){
	return {
		id: socket.id,
		name: socket.name,
		img_url: socket.img_url
	}
}



