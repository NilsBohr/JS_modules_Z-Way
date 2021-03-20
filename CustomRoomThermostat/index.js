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
	this.debug_log("Sensor's temperature state is changed. Checking temperature value..");

	var self = this;

	var vDevSensor = this.controller.devices.get(this.config.sensor),
	vDev = this.vDev;

	var sensorValue = vDevSensor.get("metrics:level"),
	mainThermostatValue = vDev.get("metrics:level"),
	delta = this.config.delta;
	
	this.debug_log("sensorValue variable value is" + sensorValue);
	this.debug_log("mainThermostat variable value is" + mainThermostatValue);
	this.debug_log("delta variable value is" + delta);
	this.debug_log("Array of managed devices value is" + JSON.stringify(self.config.devices));

	if ((sensorValue > (mainThermostatValue + delta)) && (global.climatState != "cooling")) {
		this.debug_log("Sensor's temperature is too hot. Setting thermostats temperature to 10 degree.");
		global.climatState = "cooling";
		self.config.devices.forEach(function(dev) {
			var vDevX = self.controller.devices.get(dev.device);
			if (vDevX) {
				vDevX.performCommand("exact", {level : 10});
			}
		});
	}	
	else if ((sensorValue < (mainThermostatValue - delta)) && (global.climatState != "heating")) {
		this.debug_log("Sensor's temperature is too cold. Setting thermostats temperature to 30 degree.");
		global.climatState = "heating";
		self.config.devices.forEach(function(dev) {
			var vDevX = self.controller.devices.get(dev.device);
			if (vDevX) {
				vDevX.performCommand("exact", {level : 30});
			}
		});
	}
	else {
		if (self.config.debug === true) {
			this.debug_log("Sensor's temperature is in normal range. Nothing to do.");
		}
	}
}

CustomRoomThermostat.prototype.debug_log = function (msg) {
	if (this.config.debug) {
		console.log("---  DBG[CustomRoomThermostat_" + this.id + "]: " + msg);
	}
}