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
let ROOMS = {}; // owner_key: {joined_user_key: ??, passcode: ??}

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
        console.log('broadcast to room: '+socket.key);
        io.to(socket.key).emit('room_internal_msg', 'create room');

    });

    socket.on('join_room', function (data) {
        // join room
        join_room(socket,data.user_key);

        console.log('broadcast to room: '+socket.join_room_id);
        io.to(socket.join_room_id).emit('room_internal_msg', 'join room');
    });

    socket.on('disconnect', function () {
        remove_user(socket);
    })

});

function get_user(socket) {
    return {
        key: socket.key,
        name: socket.name,
        img_url: socket.img_url
    }
}

function get_all_users() {
    let all_users = [];
    for (let i in SOCKET_LIST) {

        let user = get_user(SOCKET_LIST[i]);
        all_users.push(user);
    }
    return all_users;
}

function init_user(socket) {
    socket.key = shortid.generate();
    console.log('user ' + socket.key + ' connected'); //debug

    socket.name = socket.key;
    socket.img_url = app_url + ":" + port + '/img/avatar/1.jpg';

    SOCKET_LIST[socket.key] = socket;

    // send socket info to client
    socket.emit('change_user_done', {msg: "init user done", current_user: get_user(socket)});

    // broadcast to all users
    broadcast_all_users();

}

function change_user(socket, new_user_data) {
    console.log('user ' + socket.key + ' changed!');

    // change data
    socket.name = new_user_data.name;

    // notify client
    socket.emit('change_user_done', {msg: "update user done", current_user: get_user(socket)});

    // broadcast to all users
    broadcast_all_users();
}

function remove_user(socket) {
    // delete his room
    delete ROOMS[socket.key];

    // delete his join info and leave rooms
    remove_user_join_info(socket.key);

    // delete socket info from SOCKET_LIST
    delete SOCKET_LIST[socket.key];

    console.log('user ' + socket.key + ' disconnected');

    // broadcast to all users
    broadcast_all_users();
}

function remove_user_join_info(user_key) {

    for (let owner_key in ROOMS){
        if (ROOMS[owner_key].joined_user_key === user_key){
            ROOMS[owner_key].joined_user_key = null;
        }
    }

}

function create_room(socket, room_passcode) {

    // check if already create room
    if (ROOMS[socket.key]){
        socket.emit('my_error', 'you already created a room!'); // don't use 'error' as name as it has been reserved by system.
        return;
    }

    // add room to ROOM
    ROOMS[socket.key] = {joined_user_key: null, passcode: room_passcode};

    // socket join room
    console.log('socket join room:'+socket.key);
    socket.join(socket.key);

    // broadcast to all users
    broadcast_all_users();
}

function delete_my_room(socket) {

    // check if room exists
    if(!ROOMS[socket.key]){
        socket.emit('my_error', 'your room not found');
        return;
    }

    // remove room from ROOMS
    delete ROOMS[socket.key];

    // leave socket room
    socket.leave(socket.key, null);

    console.log('user '+ socket.key + ' delete his room');

    // broadcast to all users
    broadcast_all_users();

}

function join_room(socket, user_key) {
    console.log('join room: '+ user_key);

    // todo: check if I already join an room

    // find user_key mapped socket
    let room_onwer_socket = SOCKET_LIST[user_key];

    // check if owner socket exists
    if (!room_onwer_socket){
        socket.emit('my_error', 'room owner socket not exists!');
        return;
    }

    // check if owner room exists
    if (!ROOMS[user_key]){
        socket.emit('my_error', 'room owner already leave the room!');
        return;
    }

    // todo: check passcode

    // socket join room
    socket.join(user_key);

    // change room info. add joined_user_key
    ROOMS[user_key].joined_user_key = socket.key;

    // broadcast to all users
    broadcast_all_users();

}

function broadcast_all_users() {
    ALL_USERS = get_all_users();

    // important: hide passcode, use has_passcode attribute
    let all_rooms = {};
    for (let owner_key in ROOMS){
        let room = _.cloneDeep(ROOMS[owner_key]);

        room.has_passocode = !!room.passcode;
        delete room.passcode;

        all_rooms[owner_key] = room;
    }

    for (let i in SOCKET_LIST) {
        let socket = SOCKET_LIST[i];



        socket.emit('update_all_users', {all_users: ALL_USERS, all_rooms: all_rooms});
    }
}



