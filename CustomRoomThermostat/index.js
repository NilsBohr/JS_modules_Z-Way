function CustomRoomThermostat (id, controller) {
	// Call superconstructor first (AutomationModule)
	CustomRoomThermostat.super_.call(this, id, controller);
}

inherits(CustomRoomThermostat, AutomationModule);

_module = CustomRoomThermostat;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

CustomRoomThermostat.prototype.init = function (config) {
	CustomRoomThermostat.super_.prototype.init.call(this, config);
	var self = this;

	console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@DEBUG@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
	console.log(JSON.stringify(this.config))
	console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@DEBUG@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
	

	this.vDev = this.controller.devices.create({
		deviceId: "CustomRoomThermostat_" + this.id,
		defaults: {
			deviceType: "thermostat",
			probeType: "thermostat_set_point",
			metrics: {
				scaleTitle: '°C',
				level: 18,
				min: 10,
				max: 30,
				icon: "thermostat",
				title: self.getInstanceTitle()
			}
		},
		overlay: {},
		handler: function (command, args) {
			self.vDev.set("metrics:level", parseInt(args.level, 10));
			self.checkTemp();
		},
		moduleId: this.id
	});

	this.controller.devices.on(this.config.sensor, 'change:metrics:level', function() {
		self.checkTemp();
	});
};
CustomRoomThermostat.prototype.stop = function () {
	var self = this;

	this.controller.devices.off(this.config.sensor, 'change:metrics:level', function() {
		self.checkTemp();
	});

	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}

	CustomRoomThermostat.super_.prototype.stop.call(this);
};

CustomRoomThermostat.prototype.checkTemp = function () {
	var vDevSensor = this.controller.devices.get(this.config.sensor),
		vDev = this.vDev;
	
	if (vDevSensor.get("metrics:level") > vDev.get("metrics:level")) {
		console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@TOO HOT!!!@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
	}	
	else {
		console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@TOO COLD!!!@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
	}
	
}