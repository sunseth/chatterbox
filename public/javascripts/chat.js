var Chat = function(socket){
	this.socket = socket;
}

Chat.prototype.sendMessage = function(room, text, color){
	var message = {
		room: room,
		text: text,
		color: color
	}
	this.socket.emit('message', message);
}

Chat.prototype.changeRoom = function(room){
	this.socket.emit('join', {
		newRoom: room
	});
}

Chat.prototype.processCommand = function(command){
	var words = command.split(' ');
	var command = words[0].substring(1, words[0].length).toLowerCase();
	var message = false;
	words.shift();
	var arg = words.join(' ');

	if (command == 'join'){
		this.changeRoom(arg);
	} else if (command == 'nick'){
		this.socket.emit('nameAttempt', arg);
	} else if (command == 'color'){
		this.socket.emit('colorAttempt', arg);
	} else if(command == 'invite'){
		this.socket.emit('inviteAttempt', arg);
	} else {
		message = 'Command unrecognized';
	}

	return message;
}