// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function TowelDryer (id, controller) {
	// Call superconstructor first (AutomationModule)
	TowelDryer.super_.call(this, id, controller);
}

inherits(TowelDryer, AutomationModule);

_module = TowelDryer;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

TowelDryer.prototype.init = function (config) {
	TowelDryer.super_.prototype.init.call(this, config);
	var self = this;

	this.runScene = function() {
		var vDevSwitch = self.controller.devices.get(self.config.switch);
		
		if (self.isChecked) {
			if (vDevSwitch.get("metrics:level") === "off") {
				vDevSwitch.performCommand("on");
				console.log("--- DBG[TowelDryer_" + self.id + "]: Switch value is changed state to ON");
				self.timer = setTimeout(function() {
					if (vDevSwitch.get("metrics:level") === "on") {
						vDevSwitch.performCommand("off");
						console.log("--- DBG[TowelDryer_" + self.id + "]: Switch value is changed state to OFF");
					}
					self.isChecked = false;
					clearTimeout(self.timer);
				}, self.config.offtime * 60 * 60 * 1000);
			}
		}
	};
	this.checkConditions = function() {
		var vDevSensor = self.controller.devices.get(self.config.sensor),
		vDevSwitch = self.controller.devices.get(self.config.switch);

		var getSensorValue = vDevSensor.get("metrics:level"),
		getSwitchValue = vDevSwitch.get("metrics:level");
		
		var date = new Date();

		var startTime = Number(self.config.starttime.split(":")[0]) * 60 + Number(self.config.starttime.split(":")[1]),
  		currentTime = date.getHours() * 60 + date.getMinutes(),
		earlyTime = startTime - 360;

		
		if (((currentTime >= earlyTime) && (currentTime < startTime)) && (!self.isChecked)) {
			if (getSensorValue === "on") {
				self.isChecked = true;
			}
		}

		if (self.config.debug) {
			console.log("------------TowelDryer_" + self.id + " DEBUG------------");
			console.log("startTime: " + startTime);
			console.log("currentTime: " + currentTime);
			console.log("earlyTime: " + earlyTime);
			console.log("self.isChecked: " + self.isChecked);
			console.log("currentTime >= earlyTime: "+ (currentTime >= earlyTime));
			console.log("currentTime < startTime: " + (currentTime < startTime));
			console.log("getSensorValue === 'on': " + (getSensorValue === "on"));
			console.log("Switch state: " + getSwitchValue);
			console.log("------------TowelDryer_" + self.id + " DEBUG------------");
		}
	};

	// set up motion sensor handler
	this.controller.devices.on(this.config.sensor, 'change:metrics:level', this.checkConditions);

	// set up cron handler
	this.controller.on("TowelDryer.run." + this.id, this.runScene);

	// add cron schedule
	var wds = this.config.weekdays.map(function(x) { return parseInt(x, 10); });
	
	if (wds.length == 7) {
		wds = [null]; // same as all - hack to add single cron record. NB! changes type of wd elements from integer to null
	}

	wds.forEach(function(wd) {
		self.controller.emit("cron.addTask", "TowelDryer.run." + self.id, {
			minute: parseInt(self.config.starttime.split(":")[1], 10),
			hour: parseInt(self.config.starttime.split(":")[0], 10),
			weekDay: wd,
			day: null,
			month: null
		});
	});
};

TowelDryer.prototype.stop = function () {
	TowelDryer.super_.prototype.stop.call(this);

	this.controller.emit("cron.removeTask", "TowelDryer.run." + this.id);
	this.controller.off("TowelDryer.run." + this.id, this.runScene);

	this.controller.devices.off(this.config.sensor, 'change:metrics:level', this.checkConditions);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
