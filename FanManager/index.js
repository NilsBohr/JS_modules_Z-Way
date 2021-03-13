// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function FanManager (id, controller) {
	// Call superconstructor first (AutomationModule)
	FanManager.super_.call(this, id, controller);
}

inherits(FanManager, AutomationModule);

_module = FanManager;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

FanManager.prototype.init = function (config) {
	FanManager.super_.prototype.init.call(this, config);

	var self = this;

	this.isTurnedOnViaTemperatureSensor = false;
	this.isTurnedOnViaMotionSensor = false;

	this.checkTemperature = function() {
		var vDevTSensor = self.controller.devices.get(self.config.temperatureSensor),
		vDevSwitch = self.controller.devices.get(self.config.switch);
		
		var vDevTSensorValue = vDevTSensor.get("metrics:level"),
		vDevSwitchValue = vDevSwitch.get("metrics:level");
	

		if ((vDevTSensorValue > self.config.degree) && (self.isTurnedOnViaMotionSensor === false)) {
			if (vDevSwitchValue !== "on") {
				console.log("---  DBG[FanManager_" + self.id + "]: Sensor's temperature is changed. It's value is more than " + self.config.degree + " (current value is: " + vDevTSensorValue + "). Turning ON fan.");
				vDevSwitch.performCommand("on");
				self.isTurnedOnViaTemperatureSensor = true;
			} else {
				self.debug_log("Sensor's temperature is changed. It's value is more than " + self.config.degree + " (current value is: " + vDevTSensorValue + "), but fan is already ON. Nothing to do.");
			}
		} else if ((vDevTSensorValue < self.config.degree) && (self.isTurnedOnViaMotionSensor === false)) {
			if (vDevSwitchValue !== "off") {
				console.log("---  DBG[FanManager_" + self.id + "]: Sensor's temperature is changed. It's value is lower than " + self.config.degree + " (current value is: " + vDevTSensorValue + "). Turning OFF fan.");
				vDevSwitch.performCommand("off");
				self.isTurnedOnViaTemperatureSensor = false;
			} else {
				self.debug_log("Sensor's temperature is changed. It's value is lower than " + self.config.degree + " (current value is: " + vDevTSensorValue + "), but fan is already OFF. Nothing to do.");
			}
		} else {
			self.debug_log("Temperature sensor is triggered, but fan is currently switched on by the motion sensor. Nothing to do.");
		}	
	};

	this.checkMotion = function() {
		var vDevMSensor = self.controller.devices.get(self.config.motionSensor),
		vDevSwitch = self.controller.devices.get(self.config.switch);

		var vDevMSensorValue = vDevMSensor.get("metrics:level"),
		vDevSwitchValue = vDevSwitch.get("metrics:level");

		if ((vDevMSensorValue === "off") && (self.isTurnedOnViaTemperatureSensor === false)) {
			self.debug_log("Motion sensor changed state to OFF. Checking fan state..");
			if (vDevSwitchValue !== "on") {
				console.log("---  DBG[FanManager_" + self.id + "]: Turning ON fan for " + self.config.endtime + " min.");
				vDevSwitch.performCommand("on");
				self.isTurnedOnViaMotionSensor = true;
				if (self.timeoutTimer) {
					self.debug_log("Found existing timeout timer. Clearing it..");
					clearTimeout(self.timeoutTimer);
				}
				self.debug_log("Starting timer for " + self.config.endtime + " min..");
				self.timeoutTimer = setTimeout (function () {
					if (vDevSwitch.get("metrics:level") !== "off") {
						console.log("---  DBG[FanManager_" + self.id + "]: Timer is ended. Turning OFF fan.");
						vDevSwitch.performCommand("off");
						self.isTurnedOnViaMotionSensor = false;
					} else {
						self.debug_log("Timer is ended, but fan is already OFF. Nothing to do.");
					}
				}, self.config.endtime * 60 * 1000);
			} else {
				self.debug_log("Fan is already ON. Nothing to do.");
			}
		} else if ((vDevMSensorValue === "on") && (self.isTurnedOnViaTemperatureSensor === false)) {
			self.debug_log("Motion sensor changed state to on. Nothing to do.");
		} else {
			self.debug_log("Motion sensor is triggered, but fan is currently switched on by the temperature sensor. Nothing to do.");
		}
		
	};

	this.controller.devices.on(this.config.temperatureSensor, 'change:metrics:level', this.checkTemperature);
	this.controller.devices.on(this.config.motionSensor, 'change:metrics:level', this.checkMotion);	
};

FanManager.prototype.stop = function () {
	FanManager.super_.prototype.stop.call(this);
	
	var self = this;

	this.controller.devices.off(this.config.temperatureSensor, 'change:metrics:level', this.checkTemperature);
	this.controller.devices.off(this.config.motionSensor, 'change:metrics:level', this.checkMotion);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

FanManager.prototype.debug_log = function (msg) {
	if (this.config.debug === true) {
		console.log("---  DBG[FanManager_" + this.id + "]: " + msg);
	}
}