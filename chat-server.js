
var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");
var users = {}; 
var rooms = ['defaultRoom'];
var creator = {};
var roomList = {'defaultRoom':''};
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
 
	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.
 
		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);


var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
   //add a new user
 	socket.on('addUser',function(currUser){
 		socket.currUser = currUser;
 		socket.room = 'defaultRoom';
 		socket.join('defaultRoom');
 		socket.emit('addRoom', rooms, socket.room);
 		users[currUser] = socket.room;
 		io.sockets.in(socket.room).emit('displayUser', socket.room, users);
 	});
	//owner kicks people out of the room and remove the username out of the room list
	socket.on('kickpeople',function(kickwho, room, fromuser){
		if(users[kickwho]==room){
	       delete users[kickwho];
		   io.sockets.in(socket.room).emit('displayUser', socket.room, users);
		   socket.emit('kickOut',kickwho);
		   socket.broadcast.to(room).emit('getKicked', kickwho, room);	
		}else{
		   socket.emit('NotHere',kickwho);	
		}
		
 	});
	//owner bans people out of the room and they cannot get into the room again
	socket.on('banpeople',function(banwho, room, fromuser){
		if(users[banwho]==room){
	       delete users[banwho];
		   io.sockets.in(socket.room).emit('displayUser', socket.room, users);
		   socket.emit('banOut',banwho);
		   socket.broadcast.to(room).emit('getBanned', banwho, room);	
		}else{
		   socket.emit('NotHere',banwho);	
		}		
 	});
	
	
	//kick people out of the room
	socket.on('kicked',function(kickwho, room){
		socket.leave(room);
		socket.broadcast.to(room).emit('disconnectHandler', kickwho);
   	   	socket.join('defaultRoom');
		socket.emit('kickOut',kickwho);
		users[kickwho] = 'defaultRoom';
		socket.room='defaultRoom';
		io.sockets.in(room).emit('displayUser', room, users);
		io.sockets.in(socket.room).emit('displayUser', socket.room, users);
 	});
 	
 	//ban people out of the room
	socket.on('banned',function(banwho, room){
		socket.leave(room);
		socket.broadcast.to(room).emit('disconnectHandler', banwho);
   	   	socket.join('defaultRoom');
		socket.emit('banOut',banwho);
		users[banwho] = 'defaultRoom';
		socket.room='defaultRoom';
		io.sockets.in(room).emit('displayUser', room, users);
		io.sockets.in(socket.room).emit('displayUser', socket.room, users);
 	});
 	
 	//users create their own room with/without a password and display the room name
 	socket.on("addRoom", function(room, password, creator){
   	 	roomList[room] = password;
		creator[room] = creator;
		rooms.push(room);
        socket.emit('displayRoom', rooms, room);
        socket.broadcast.emit('displayRoom', rooms, room);
  	});
  	
    //users join a room in the room list
 	socket.on("enterRoom", function(room, pswdMatch){
 		var password = roomList[room]; 
 		var oldRoom = socket.room;
 		//no password
 		if (password == ""){
    		socket.leave(oldRoom);
    		socket.broadcast.to(oldRoom).emit('disconnectHandler', socket.currUser);
   	   		socket.join(room);
    		users[socket.currUser] = room;
    		socket.room = room;
 		}else{
 		//check the password
 			if(pswdMatch == password){
 				socket.leave(oldRoom);
 				socket.broadcast.to(oldRoom).emit('disconnectHandler', socket.currUser);
   	   			socket.join(room);
    			users[socket.currUser] = room;
    			socket.room = room;
 			}else{
 				socket.emit('error', pswdMatch);
 			}
 		}
 		io.sockets.in(oldRoom).emit('displayUser', oldRoom, users);
		io.sockets.in(socket.room).emit('displayUser', socket.room, users);
  	});
  	//send a private message to another user
  	socket.on("sendPrivateMsg", function(username, privateM, sender){
			socket.broadcast.to(socket.room).emit('displayPrivateMsg', username, privateM, sender);			
	});
 	//send message to others in the same room
	socket.on('message_to_server', function(data) {
		io.sockets.in(socket.room).emit("message_to_client",socket.currUser, data["message"]); 
	});
	
});