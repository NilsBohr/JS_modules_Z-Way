
// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function networkSilenceDetection (id, controller) {
    // Call superconstructor first (AutomationModule)
    networkSilenceDetection.super_.call(this, id, controller);
}

inherits(networkSilenceDetection, AutomationModule);

_module = networkSilenceDetection;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

networkSilenceDetection.prototype.init = function (config) {
    networkSilenceDetection.super_.prototype.init.call(this, config);

    var self = this;

    self.bindedDevices = [];

	self.restartTimeout = function () {
		if (self.timeoutTimer) {
			clearTimeout(self.timeoutTimer);
		}

		self.timeoutTimer = setTimeout(function() {
			// no network activity within 30 minutes, something is wrong(!)
			// try to recover network
	        var data = fs.load('apikey'), apikey = data.trim() || '';
			
			http.request({
                    url: 'https://api-center.senseloopcore.no/v1/hubs/' + apikey + '/z-way-freeze',
                    method: "GET",
                    async: true,
                    success: function(response) {
                        console.log("Request completed. No activity within 30 minutes"); 
                    },
                    error: function(response) {
                        console.log("Can not make request remote server.No activity within 30 minutes"); 
                    }
                });
			zway.GetHomeId();
			self.timeoutTimer = false;
		}, 30*60*1000);
	}

	self.checkDeviceNotBindedYet = function (nodeId) {
		for (var i = 0; i < self.bindedDevices.length; i++) {
			if (self.bindedDevices[i] === nodeId) {
				return false;
			}
		}
		return true;
	}

	self.bindToAllPackets = function (nodeId) {
		if (self.checkDeviceNotBindedYet(nodeId)) {
			console.log("Binding to node", nodeId);
			zway.devices[nodeId].data.lastReceived.bind(self.restartTimeout);
	        self.bindedDevices.push(nodeId);
		}
	}


    // catch newly created devices
	controller.devices.on('created', function(vDev) {
		var match = vDev.id.split('_');
		var nodeId = parseInt(match[2]);
		self.bindToAllPackets(nodeId);
	});

	// enumerate existing devices
	controller.devices.forEach(function(vDev) {
		var pattern = "(ZWayVDev_([^_]+)_([0-9]+))-([0-9]+)((-[0-9]+)*)",
			match = vDev.id.match(pattern);
			
		if (match) {
			//only for Z-Wave devices
			var divide = vDev.id.split('_');
			var nodeId = parseInt(divide[2]);
			console.log(nodeId, vDev.id);
			self.bindToAllPackets(nodeId);
		}
	});

	self.timeoutTimer = false;

	self.restartTimeout();
};

networkSilenceDetection.prototype.stop = function () {
    networkSilenceDetection.super_.prototype.stop.call(this);

    var self = this;
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
