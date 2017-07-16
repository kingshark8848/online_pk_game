const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http, {});

// serve staic file
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
})


