// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function CustomFloorHeating (id, controller) {
	// Call superconstructor first (AutomationModule)
	CustomFloorHeating.super_.call(this, id, controller);
}

inherits(CustomFloorHeating, AutomationModule);

_module = CustomFloorHeating;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

CustomFloorHeating.prototype.init = function (config) {
	CustomFloorHeating.super_.prototype.init.call(this, config);

	var self = this;

	if (this.intervalTimer) {
		clearInterval(this.intervalTimer);
	}

	this.runScene = function() {
		var vDevSwitch = self.controller.devices.get(self.config.switch),
		vDevSensor = self.controller.devices.get(self.config.sensor),
		vDevThermostat = self.controller.devices.get(self.config.thermostat);
	
		var vDevSwitchValue = vDevSwitch.get("metrics:level"),
		vDevSensorValue = vDevSensor.get("metrics:level"),
		vDevThermostatValue = vDevThermostat.get("metrics:level"),
		sensorConditionDegree = self.config.sensorConditionDegree,
		thermostatConditionDegree = self.config.thermostatConditionDegree;

		var date = new Date();

		var currentTime = date.getHours() * 60 + date.getMinutes(),
		startTime = Number(self.config.starttime.split(":")[0]) * 60 + Number(self.config.starttime.split(":")[1]),
		endTime = Number(self.config.endtime.split(":")[0]) * 60 + Number(self.config.endtime.split(":")[1]);

		self.debug_log("------------CustomFloorHeating_" + self.id +" DEBUG------------");
		self.debug_log("currentTime is: " + currentTime);
		self.debug_log("startTime is: " + startTime);
		self.debug_log("endTime is: " + endTime);
		self.debug_log("Switch value is: " + vDevSwitchValue);
		self.debug_log("Sensor value is: " + vDevSensorValue);
		self.debug_log("Thermostat value is: " + vDevThermostatValue);
		self.debug_log("Sensor degree condition value is: " + sensorConditionDegree);
		self.debug_log("Thermostat degree condition value is: " + thermostatConditionDegree);
		self.debug_log("currentTime >= startTime: " + (currentTime >= startTime));
		self.debug_log("currentTime < endTime: " + (currentTime < endTime));
		self.debug_log("vDevSensorValue < sensorConditionDegree: " + (vDevSensorValue < sensorConditionDegree));
		self.debug_log("------------CustomFloorHeating_" + self.id +" DEBUG------------");

		if ((currentTime >= startTime) && (currentTime < endTime)) {
			if (vDevSensorValue < sensorConditionDegree) {
				if (vDevSwitchValue !== "on") {
					self.debug_log("Switch value is changed state to ON (current temperature value is "+ vDevSensorValue + ", current time is: " + date.getHours() + ":" + date.getMinutes()+ ")");
					vDevSwitch.performCommand("on");
					if (vDevThermostatValue !== thermostatConditionDegree) {
						vDevThermostat.performCommand("exact", {level : thermostatConditionDegree});
						self.debug_log("Thermostat value was: " + vDevThermostatValue + ". Thermostat value set to: "+  thermostatConditionDegree);
					}
				}

				if (!self.intervalTimer) {
					self.intervalTimer = setInterval(function() {
						vDevThermostat.performCommand("update");
					}, 60 * 1000)
				}
			}
		}
	};

	this.stopScene = function() {
		var vDevSwitch = self.controller.devices.get(self.config.switch);
	
		var vDevSwitchValue = vDevSwitch.get("metrics:level");

		var date = new Date();

		if (vDevSwitchValue !== "off") {
			self.debug_log("Switch value is changed state to OFF (current time is: " + date.getHours() + ":" + date.getMinutes()+ ")");
			vDevSwitch.performCommand("off");
		}
		else {
			self.debug_log("Switch is already OFF (current time is: " + date.getHours() + ":" + date.getMinutes()+ ")");
		}

		clearInterval(self.intervalTimer);
	};

	
	this.controller.devices.on(this.config.sensor, 'change:metrics:level', this.runScene);
	
	// set up cron handler
	this.controller.on("CustomFloorHeating.run." + self.id, this.runScene);
	this.controller.on("CustomFloorHeating.stop." + self.id, this.stopScene);

	// add cron schedule
	var wds = this.config.weekdays.map(function(x) { return parseInt(x, 10); });
	
	if (wds.length == 7) {
		wds = [null]; // same as all - hack to add single cron record. NB! changes type of wd elements from integer to null
	}

	wds.forEach(function(wd) {
		self.controller.emit("cron.addTask", "CustomFloorHeating.run." + self.id, {
			minute: parseInt(self.config.starttime.split(":")[1], 10),
			hour: parseInt(self.config.starttime.split(":")[0], 10),
			weekDay: wd,
			day: null,
			month: null
		});
		self.controller.emit("cron.addTask", "CustomFloorHeating.stop." + self.id, {
			minute: parseInt(self.config.endtime.split(":")[1], 10),
			hour: parseInt(self.config.endtime.split(":")[0], 10),
			weekDay: wd,
			day: null,
			month: null
		});
	});
};

CustomFloorHeating.prototype.stop = function () {
	CustomFloorHeating.super_.prototype.stop.call(this);
	
	var self = this;

	if (this.intervalTimer) {
		clearInterval(this.intervalTimer);
	}

	this.controller.devices.off(this.config.sensor, 'change:metrics:level', this.runScene);

	this.controller.emit("cron.removeTask", "CustomFloorHeating.run." + this.id);
	this.controller.off("CustomFloorHeating.run." + this.id, this.runScene);

	this.controller.emit("cron.removeTask", "CustomFloorHeating.stop." + this.id);
	this.controller.off("CustomFloorHeating.stop." + this.id, this.stopScene);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

CustomFloorHeating.prototype.debug_log = function (msg) {
	if (this.config.debug) {
		console.log("---  DBG[CustomFloorHeating_" + this.id + "]: " + msg);
	}
}