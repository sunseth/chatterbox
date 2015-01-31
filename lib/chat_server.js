var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};
var currentColors = {};
var nameToID = {};
var IDtoSocket = {};

function listen(server){
	io = socketio.listen(server);
	io.set('log level', 1);

	io.sockets.on('connection', function(socket){
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
		currentColors[socket.id] = 'black';
		IDtoSocket[socket.id] = socket;
		joinRoom(socket, 'Lobby');

		handleMessageBroadcasting(socket, nickNames);
		handleNameChangeAttempts(socket, nickNames, namesUsed);
		handleColorChangeAttempts(socket, currentColors);
		handleInviteAttempts(socket, nameToID, IDtoSocket);
		handleRoomJoining(socket);

		socket.on('rooms', function(){
			socket.emit('rooms', io.sockets.manager.rooms);
		});

		handleClientDisconnection(socket, nickNames, namesUsed);
	});
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed){
	var name = 'Guest ' + guestNumber;
	nickNames[socket.id] = name;
	nameToID[name] = socket.id;
	socket.emit('nameResult', {
		success: true,
		name: name
	});
	namesUsed.push(name);
	return guestNumber + 1;
}

function joinRoom(socket, room){
	socket.join(room);
	currentRoom[socket.id] = room;
	socket.emit('joinResult', {room: room});
	socket.broadcast.to(room).emit('message', {
		text: nickNames[socket.id] + ' has joined ' + room + '.'
	});

	var usersInRoom = io.sockets.clients(room);
	if (usersInRoom.length > 1){
		var usersInRoomSummary = 'Users in ' + room + ": ";
		for (var index in usersInRoom){
			var userSocketId = usersInRoom[index].id;
			if (userSocketId != socket.id){
				if (index > 0){
					usersInRoomSummary += ", ";
				} usersInRoomSummary += nickNames[userSocketId];
			}
		}
		usersInRoomSummary += '.';
		socket.emit('message', {text: usersInRoomSummary});
	}
}

function handleColorChangeAttempts(socket, colors){
	socket.on('colorAttempt', function(color){
		currentColors[socket.id] = color;
		socket.emit('colorResult', {
			color: color
		});
	});
}

function handleNameChangeAttempts(socket, nickNames, namesUsed){
	socket.on('nameAttempt', function(name){
		if (name.indexOf('Guest') == 0){
			socket.emit('nameResult', {
				success: false,
				message: "Names can't start with 'Guest"
			});
		} else {
			if (namesUsed.indexOf(name) == -1){
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				nameToID[name] = socket.id;
				delete namesUsed[previousNameIndex];
				delete nameToID[previousName];
				socket.emit('nameResult', {
					success: true,
					name: name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + ' is now known as ' + name + '.'
				});	
			} else {
				socket.emit('nameResult', {
					success: false,
					message: 'Name in use'
				});
			}
		}
	});
}

function handleInviteAttempts(socket, nameToID, IDtoSocket){
	socket.on('inviteAttempt', function(name){
		var ID = nameToID[name];
		var s = IDtoSocket[ID];
		if (ID != undefined){
			s.emit('invite', {
				success: true,
				inviter: nickNames[socket.id],
				room: currentRoom[socket.id]
			});
		} else {
			socket.emit('invite', {
				success: false,
				message: name + ' does not exist.'
			});
		}
	});
}

function handleMessageBroadcasting(socket){
	socket.on('message', function(message){
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ": " + message.text,
			color: message.color
		});
	});
}

function handleRoomJoining(socket){
	socket.on('join', function(room){
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}

function handleClientDisconnection(socket){
	socket.on('disconnect', function(){
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		var name = nickNames[socket.id];
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
		delete nameToID[name];
		delete IDtoSocket[socket.id];
	});
}

exports.listen = listen;