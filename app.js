const express = require('express');
const app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let shortid = require('shortid');
let app_url = 'http://localhost';
let port = 3000;

// serve staic file
app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

http.listen(port, function () {
    console.log('Example app listening on port ' + port + '!');
});

let SOCKET_LIST = {};
let ALL_USERS = [];
let ROOMS = [];

io.on('connection', function (socket) {

    // init socket
    init_user(socket);

    socket.on('change_user', function (data) {
        // change user
        change_user(socket, data);

    });

    socket.on('disconnect', function () {
        // remove user
        remove_user(socket);
    })

});

function get_user(socket) {
    return {
        id: socket.id,
        name: socket.name,
        img_url: socket.img_url,
        room: socket.room
    }
}

function get_all_users() {
    let all_users = [];
    for (let i in SOCKET_LIST) {
        all_users.push(get_user(SOCKET_LIST[i]));
    }
    return all_users;
}

function init_user(socket) {
    socket.id = shortid.generate();
    console.log('user ' + socket.id + ' connected'); //debug

    socket.name = socket.id;
    socket.img_url = app_url + ":" + port + '/img/avatar/1.jpg';
    socket.room = null;

    SOCKET_LIST[socket.id] = socket;

    // send socket info to client
    socket.emit('init_user', get_user(socket));

    // broadcast to all users
    broadcast_all_users();

}

function change_user(socket, new_user_data) {
    console.log('user ' + socket.id + ' changed!');

    // change data
    socket.name = new_user_data.name;

    // notify client
    socket.emit('change_user_done', get_user(socket));

    // broadcast to all users
    broadcast_all_users();
}

function remove_user(socket) {
    delete SOCKET_LIST[socket.id];
    console.log('user ' + socket.id + ' disconnected');

    // broadcast to all users
    broadcast_all_users();
}

function broadcast_all_users() {
    ALL_USERS = get_all_users();

    for (let i in SOCKET_LIST) {
        let socket = SOCKET_LIST[i];
        socket.emit('update_all_users', ALL_USERS);
    }
}



