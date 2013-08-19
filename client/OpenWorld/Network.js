OW.network = Object.create(IB.network);

///////////////////////////////////////////////

OW.network.server_address = "http://localhost";

///////////////////////////////////////////////

OW.subEngines.push(OW.network);

/////////////////////////////////////////

OW.network.connectToServer = function() {
	var self = this;
	self.__proto__.connectToServer.apply(self);

	self.server.on("connect", function () {
		OW.network.server.emit("init", {id: OW.player.id, username: OW.player.username, willServe: true});
	});
	
	self.server.on("init", function (data) {console.log(data);});


	// Connect to PeerJS, have server assign an ID instead of providing one
    var peer = new Peer({key: 'lwjd5qra8257b9', debug: true});
	//var peer = new Peer({host:'localhost', port:9000, debug: true});

	// Show this peer's ID.
	peer.on('open', function(id){
	  	console.log('Peer Connection Id:', id);
		self.server.emit('publishPeer', id);
	});

	// Handle connection to new peer
	var connectToPeer = function(newPeerId) {
		var c = peer.connect(newPeerId);
		c.on('open', function(e) {
			console.log('Connected to ', newPeerId);
		});
		c.on('data', function(data) {
			console.log('Data:', data);
		});
	};

	// Await connections from others
	peer.on('connection', function(conn) {
		console.log(conn);
		// Connect back
		connectToPeer(conn.peer);

		// Notification
		var options = {
		    title: "Peer Connected",
		    html: "Connected to new Peer "+conn.peer+".",
		    id: "ConnectedToPeer-"+conn.peer+"", // optional, a unique identifier for this notification
		    delay: 3000 // optional (default to 3000), number of milliseconds until notification auto-closes. If set to 0, the notification persists until manually closed
		};
		Clay.UI.createNotification( options );

	});

	self.server.on('publishedPeer', function(newPeerId) {
		connectToPeer(newPeerId);
	});


};