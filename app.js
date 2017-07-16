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
ALL_USERS = [];

io.on('connection', function(socket){
  socket.id = shortid.generate();
  console.log('user '+socket.id+' connected');
  socket.name = socket.id;
  socket.img_url = app_url + ":" + port + '/img/avatar/1.jpg';
  SOCKET_LIST[socket.id] = socket;

  // send socket info to client
  socket.emit('init_user', get_user(socket));

  socket.on('change_user', function(data){
  	console.log('user '+data.id+' changed!');

  	// change data
  	socket.name = data.name;

  	// notify client
  	socket.emit('change_user_done', get_user(socket));

  })

  socket.on('disconnect', function(){
  	delete SOCKET_LIST[socket.id];
    console.log('user '+socket.id+' disconnected');
  })

})

setInterval(function(){

	ALL_USERS = get_all_users();

	for (var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('update_all_users', ALL_USERS);
	}

},1000)

function get_user(socket){
	return {
		id: socket.id,
		name: socket.name,
		img_url: socket.img_url
	}
}

function get_all_users(){
	var all_users = [];
	for (var i in SOCKET_LIST){
		all_users.push(get_user(SOCKET_LIST[i]));
	}
	return all_users;
}



