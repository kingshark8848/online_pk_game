const express = require('express');
const app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let shortid = require('shortid');
let app_url = 'http://localhost';
let port = 3000;

let _ = require('lodash');

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

    socket.on('create_game_room', function (data) {
        // create room
        create_room(socket, data);

        // broadcast to room
        console.log('broadcast to room: '+socket.my_room.id);
        io.to(socket.my_room.id).emit('room_internal_msg', 'create room');

    });

    socket.on('join_room', function (data) {
        // join room
        join_room(socket,data.user_key);

        console.log('broadcast to room: '+socket.join_room_id);
        io.to(socket.join_room_id).emit('room_internal_msg', 'join room');
    });

    socket.on('disconnect', function () {
        // clear all his joined info
        let joined_room_socket = SOCKET_LIST[socket.join_room_id];
        if (joined_room_socket.my_room && joined_room_socket.my_room.joined_user_key === socket.key){
            joined_room_socket.my_room.joined_user_key = null;
        }

        joined_room_socket.emit('change_user_done', get_user(joined_room_socket));

        // leave room
        socket.leave(socket.join_room_id, function () {
            // remove user
            remove_user(socket);
        });


    })

});

function get_user(socket) {
    return {
        key: socket.key,
        name: socket.name,
        img_url: socket.img_url,
        my_room: _.cloneDeep(socket.my_room), //important
        join_room_id: socket.join_room_id
    }
}

function get_all_users() {
    let all_users = [];
    for (let i in SOCKET_LIST) {

        let user = get_user(SOCKET_LIST[i]);
        // important: hide passcode
        if (user.my_room){
            user.my_room.has_passcode = user.my_room.passcode.trim() !== '';
            delete user.my_room['passcode'];
        }

        all_users.push(user);
    }
    return all_users;
}

function init_user(socket) {
    socket.key = shortid.generate();
    console.log('user ' + socket.key + ' connected'); //debug

    socket.name = socket.key;
    socket.img_url = app_url + ":" + port + '/img/avatar/1.jpg';
    socket.my_room = null;
    socket.join_room_id = null;

    SOCKET_LIST[socket.key] = socket;

    // send socket info to client
    socket.emit('init_user', get_user(socket));

    // broadcast to all users
    broadcast_all_users();

}

function change_user(socket, new_user_data) {
    console.log('user ' + socket.key + ' changed!');

    // change data
    socket.name = new_user_data.name;

    // notify client
    socket.emit('change_user_done', get_user(socket));

    // broadcast to all users
    broadcast_all_users();
}

function remove_user(socket) {
    delete SOCKET_LIST[socket.key];
    console.log('user ' + socket.key + ' disconnected');

    // broadcast to all users
    broadcast_all_users();
}

function create_room(socket, room_passcode) {

    // check if already create room
    if (socket.my_room){
        socket.emit('my_error', 'you already created a room!'); // don't use 'error' as name as it has been reserved by system.
        return;
    }

    // add room prop to socket
    socket.my_room = {id: socket.key, passcode: room_passcode, joined_user_key:null};

    // socket join room
    console.log('socket join room:'+socket.my_room.id);
    socket.join(socket.my_room.id);

    // notify client
    // todo: merge the msg of create_room_done, init_user, change_user_done, add status in the data.
    socket.emit('create_room_done', get_user(socket));

    // broadcast to all users
    broadcast_all_users();
}

function delete_my_room(socket) {

    // check if room exists
    if(!socket.my_room){
        socket.emit('my_error', 'your room not found');
        return;
    }

    if (socket.my_room.joined_user_key){
        // clear joined user's info
        let joined_socket = SOCKET_LIST[socket.my_room.joined_user_key];
        joined_socket.join_room_id = null;

        // notidy the joined user
        joined_socket.emit('change_user_done', get_user(joined_socket));

    }

    // remove my room data
    socket.my_room = null;

    // notify client
    socket.emit('change_user_done', get_user(socket));

    console.log('user '+ socket.key + ' delete his room');

    // broadcast to all users
    broadcast_all_users();

}

function join_room(socket, user_key) {
    console.log('join room: '+ user_key);

    // find user_key mapped socket
    let room_onwer_socket = SOCKET_LIST[user_key];

    // check if owner socket exists
    if (!room_onwer_socket){
        socket.emit('my_error', 'room owner socket not exists!');
        return;
    }

    // check if owner room exists
    if (!room_onwer_socket.my_room){
        socket.emit('my_error', 'room owner already leave the room!');
        return;
    }

    // todo: check passcode

    // socket join room
    socket.join(room_onwer_socket.my_room.id);

    // add room prop to socket
    socket.join_room_id = room_onwer_socket.my_room.id;

    // add user's key to room owner's room obejct
    room_onwer_socket.my_room.joined_user_key = socket.key;

    // notify owner
    room_onwer_socket.emit('some_join_you', get_user(room_onwer_socket));

    // notify client
    socket.emit('join_room_done', get_user(socket));

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



