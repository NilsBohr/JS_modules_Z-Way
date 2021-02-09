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

	// set up cron handler
	self.controller.on("CustomFloorHeating.run." + self.id, function() {
		self.performSwitchCommand(true);
	});
	self.controller.on("CustomFloorHeating.stop." + self.id, function() {
		self.performSwitchCommand(false);
	});

	// add cron schedule
	var wds = self.config.weekdays.map(function(x) { return parseInt(x, 10); });
	
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

	self.controller.emit("cron.removeTask", "CustomFloorHeating.run." + this.id);
	self.controller.off("CustomFloorHeating.run." + this.id, function() {
		self.performSwitchCommand(true);
	});

	self.controller.emit("cron.removeTask", "CustomFloorHeating.stop." + this.id);
	self.controller.off("CustomFloorHeating.stop." + this.id, function() {
		self.performSwitchCommand(false);
	});
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

CustomFloorHeating.prototype.performSwitchCommand = function (status) {
	var vDevSwitch = this.controller.devices.get(this.config.switch),
	vDevSensor = this.controller.devices.get(this.config.sensor);
	
	var vDevSwitchValue = vDevSwitch.get("metrics:level"),
	vDevSensorValue = vDevSensor.get("metrics:level"),
	degreeValue = this.config.degree;

	if (status) {	
		if ((vDevSensorValue < degreeValue) && vDevSwitchValue !== "on") {
			console.log("DBG[CustomFloorHeating_" + this.id + "]: Switch value is changed state to ON");
			vDevSwitch.set("metrics:level", "on");
		}
		else {
			console.log("DBG[CustomFloorHeating_" + this.id + "]: Temperature is not in the right range or switch is already in ON state. Nothing to do.");
		}
	}
	else {
		if (vDevSwitchValue !== "off") {
			console.log("DBG[CustomFloorHeating_" + this.id + "]: Switch value is changed state to OFF");
			vDevSwitch.set("metrics:level", "off");
		}
		else {
			console.log("DBG[CustomFloorHeating_" + this.id + "]: Switch is already in OFF state. Nothing to do.");
		}
	}	
}
