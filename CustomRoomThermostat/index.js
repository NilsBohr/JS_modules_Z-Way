// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

CustomRoomThermostat.prototype.checkTemp = function () {
	console.log("DBG[CustomRoomThermostat_", this.id,"]: Temperature sensor's state is changed. Checking temperature value..");

	var self = this;

	var vDevSensor = this.controller.devices.get(this.config.sensor),
	vDev = this.vDev;
	
	var sensorValue = vDevSensor.get("metrics:level"),
	mainThermostatValue = vDev.get("metrics:level"),
	delta = this.config.delta;

	if (sensorValue > (mainThermostatValue + delta)) {
		console.log("DBG[CustomRoomThermostat_", this.id,"]: Temperature is too hot. Setting thermostats temperature to 10 degree.");
		self.config.devices.forEach(function(dev) {
			var vDevX = self.controller.devices.get(dev.device);
			if (vDevX) {
				vDevX.set("metrics:level",10);
			}
		});
	}	
	else if (sensorValue < (mainThermostatValue - delta)) {
		console.log("DBG[CustomRoomThermostat_", this.id,"]: Temperature is too cold. Setting thermostats temperature to 30 degree.");
		self.config.devices.forEach(function(dev) {
			var vDevX = self.controller.devices.get(dev.device);
			if (vDevX) {
				vDevX.set("metrics:level",30);
			}
		});
	}
	else {
		console.log("DBG[CustomRoomThermostat_", this.id,"]: Temperature is normal range. Nothing to do.");
	}
}