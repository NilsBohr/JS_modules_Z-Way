// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function ThermostatShoeDryer (id, controller) {
	// Call superconstructor first (AutomationModule)
	ThermostatShoeDryer.super_.call(this, id, controller);
}

inherits(ThermostatShoeDryer, AutomationModule);

_module = ThermostatShoeDryer;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

ThermostatShoeDryer.prototype.init = function (config) {
	ThermostatShoeDryer.super_.prototype.init.call(this, config);
	var self = this;

	this.runScene = function() {
		var vDevSwitch = self.controller.devices.get(self.config.switch),
		vDevThermostat = self.controller.devices.get(self.config.thermostat);
		
		if (self.isChecked) {
			if (vDevSwitch.get("metrics:level") === "off") {
				vDevSwitch.performCommand("on");
				if (vDevThermostat.get("metrics:level") !== self.config.thermostatConditionDegree) {
					vDevThermostat.performCommand("exact", {level : self.config.thermostatConditionDegree});
					self.debug_log("Thermostat changed its value to: " + self.config.thermostatConditionDegree);
				}
				self.debug_log("Switch value is changed state to ON");
				self.timer = setTimeout(function() {
					if (vDevSwitch.get("metrics:level") === "on") {
						vDevSwitch.performCommand("off");
						self.debug_log("Switch value is changed state to OFF");
					}
					self.isChecked = false;
					clearTimeout(self.timer);
				}, self.config.offtime * 60 * 60 * 1000);
			}
		}
	};
	this.checkConditions = function() {
		var vDevWeather = self.controller.devices.get(self.config.informer),
		vDevSensor = self.controller.devices.get(self.config.sensor),
		vDevSwitch = self.controller.devices.get(self.config.switch),
		configStartTime = self.config.starttime.split(":");

		var getWeatherValue = vDevWeather.get("metrics:zwaveOpenWeather:weather"),
		getSensorValue = vDevSensor.get("metrics:level"),
		getSwitchValue = vDevSwitch.get("metrics:level");
		
		var date = new Date();

		var startTime = Number(configStartTime[0]) * 60 + Number(configStartTime[1]),
  		currentTime = date.getHours() * 60 + date.getMinutes(),
		earlyTime = startTime - 180;

		
		if (((currentTime >= earlyTime) && (currentTime < startTime)) && (!self.isChecked)) {
			if (getWeatherValue[0].main === "Rain" && getSensorValue === "on") {
				self.isChecked = true;
			}
		}
		self.debug_log("-----ThermostatShoeDryer" + self.id + "DEBUG-----");
		self.debug_log("startTime: " + startTime);
		self.debug_log("currentTime: " + currentTime);
		self.debug_log("earlyTime: " + earlyTime);
		self.debug_log("self.isChecked: " + self.isChecked);
		self.debug_log("currentTime >= earlyTime: "+ (currentTime >= earlyTime));
		self.debug_log("currentTime < startTime: " + (currentTime < startTime));
		self.debug_log("getWeatherValue[0].main === 'Rain': " + (getWeatherValue[0].main === "Rain"));
		self.debug_log("getSensorValue === 'on': " + (getSensorValue === "on"));
		self.debug_log("Switch state: " + getSwitchValue);
		self.debug_log("-----ThermostatShoeDryer" + self.id + "DEBUG-----");
	};

	// set up cron handler
	this.controller.on("ThermostatShoeDryer.run." + this.id, this.runScene);

	// set up motion and rain handler
	this.controller.devices.on(this.config.sensor, 'change:metrics:level', this.checkConditions);
	this.controller.devices.on(this.config.informer, 'metrics:zwaveOpenWeather:weather', this.checkConditions);

	// add cron schedule
	var wds = this.config.weekdays.map(function(x) { return parseInt(x, 10); });
	
	if (wds.length == 7) {
		wds = [null]; // same as all - hack to add single cron record. NB! changes type of wd elements from integer to null
	}

	wds.forEach(function(wd) {
		self.controller.emit("cron.addTask", "ThermostatShoeDryer.run." + self.id, {
			minute: parseInt(self.config.starttime.split(":")[1], 10),
			hour: parseInt(self.config.starttime.split(":")[0], 10),
			weekDay: wd,
			day: null,
			month: null
		});
	});
};

ThermostatShoeDryer.prototype.stop = function () {
	ThermostatShoeDryer.super_.prototype.stop.call(this);

	this.controller.emit("cron.removeTask", "ThermostatShoeDryer.run." + this.id);
	this.controller.off("ThermostatShoeDryer.run." + this.id, this.runScene);

	this.controller.devices.off(this.config.sensor, 'change:metrics:level', this.checkConditions);
	this.controller.devices.off(this.config.informer, 'metrics:zwaveOpenWeather:weather', this.checkConditions);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

ThermostatShoeDryer.prototype.debug_log = function (msg) {
	if (this.config.debug) {
		console.log("---  DBG[ThermostatShoeDryer_" + this.id + "]: " + msg);
	}
}