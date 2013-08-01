OW.pc = Object.create(IB.pc);

/////////////////////////////////////////

OW.pc.name = "OpenWorldPlayerController";

OW.pc.mode = null;

OW.pc.camDistance = 10;

OW.pc.camAngle = 35;

////////////////////////////

OW.pc.DEFAULT_PAWN = "pawn";

OW.pc.DEFAULT_INPUT = "Input";

OW.pc.START_MODE = "flying";

//////////////////////////////////////////

OW.pc.initPlayerController = function () {
	//WATCH OUT!!!!! OW.pc gets used as the __proto__ for the player controller, so IB.pc is two protos back
	this.__proto__.__proto__.initPlayerController.apply(this);
};

OW.pc.getDefault = function (def) {
	return OW[this[def]];
};

OW.pc.getPawn = function () {
	this.pawn = OW.world.spawn(this.getDefault("DEFAULT_PAWN"), undefined, undefined, this, {geometry: {value: new THREE.CubeGeometry(16, 16, 50)}, material: {value: new THREE.MeshLambertMaterial({color: 0xCC0000})}});
};

OW.pc.tick = function (deltaTime) {
	this.__proto__.__proto__.tick.apply(this, [deltaTime]);
	
	if (this.input.forward && !this.input.backward) {
		this.pawn.position.z += (50 * deltaTime) + (50 * deltaTime * this.input.boost);
	}
	else if (this.input.backward && !this.input.forward) {
		this.pawn.position.z -= (50 * deltaTime) + (50 * deltaTime * this.input.boost);
	}
	
	this.camera.position.y = this.pawn.position.y + (this.camDistance * Math.sin(this.camAngle*Math.PI/180));
	
	this.camera.position.z = this.pawn.position.z - (this.camDistance * Math.cos(this.camAngle*Math.PI/180));
	
	this.camera.lookAt(this.pawn.position);
};

OW.pc.getCam = function (cam) {
	if (typeof cam === "object") {
		//possess cam
	}
	else {
		this.camera = OW.requestPerspectiveCamera();
	}
};