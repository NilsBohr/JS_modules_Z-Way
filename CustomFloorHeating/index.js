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

	this.runScene = function() {
		var vDevSwitch = self.controller.devices.get(self.config.switch),
		vDevSensor = self.controller.devices.get(self.config.sensor);
	
		var vDevSwitchValue = vDevSwitch.get("metrics:level"),
		vDevSensorValue = vDevSensor.get("metrics:level"),
		degreeValue = self.config.degree;

		var date = new Date();

		var currentTime = date.getHours() * 60 + date.getMinutes(),
		startTime = Number(self.config.starttime.split(":")[0]) * 60 + Number(self.config.starttime.split(":")[1]),
		endTime = Number(self.config.endtime.split(":")[0]) * 60 + Number(self.config.endtime.split(":")[1]);

		if (self.config.debug === true) {
			console.log("--------CustomFloorHeating_" + self.id +" DEBUG--------");
			console.log("currentTime is: " + currentTime);
			console.log("startTime is: " + startTime);
			console.log("endTime is: " + endTime);
			console.log("Switch value is: " + vDevSwitchValue);
			console.log("Sensor value is: " + vDevSensorValue);
			console.log("Degree condition value is: " + degreeValue);
			console.log("currentTime >= startTime: " + (currentTime >= startTime));
			console.log("currentTime < endTime: " + (currentTime < endTime));
			console.log("vDevSensorValue < degreeValue: " + (vDevSensorValue < degreeValue));
			console.log("--------CustomFloorHeating_" + self.id +" DEBUG--------");
		}

		if ((currentTime >= startTime) && (currentTime < endTime)) {
			if (vDevSensorValue < degreeValue) {
				if (vDevSwitchValue !== "on") {
					console.log("--- DBG[CustomFloorHeating_" + self.id + "]: Switch value is changed state to ON (current temperature value is "+ vDevSensorValue + ")");
					vDevSwitch.performCommand("on");
				}
			}
		}
	};

	this.stopScene = function() {
		var vDevSwitch = self.controller.devices.get(self.config.switch);
	
		var vDevSwitchValue = vDevSwitch.get("metrics:level");

		if (vDevSwitchValue !== "off") {
			console.log("--- DBG[CustomFloorHeating_" + self.id + "]: Switch value is changed state to OFF");
			vDevSwitch.performCommand("off");
		}
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

	this.controller.devices.off(this.config.sensor, 'change:metrics:level', this.runScene);

	this.controller.emit("cron.removeTask", "CustomFloorHeating.run." + this.id);
	this.controller.off("CustomFloorHeating.run." + this.id, this.runScene);

	this.controller.emit("cron.removeTask", "CustomFloorHeating.stop." + this.id);
	this.controller.off("CustomFloorHeating.stop." + this.id, this.stopScene);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------