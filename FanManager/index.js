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
	this.isTurnedOnViaLight = false;
	this.isEnabledManualMode = false;

	this.checkTemperature = function() {
		var vDevTSensor = self.controller.devices.get(self.config.temperatureSensor),
		vDevSwitch = self.controller.devices.get(self.config.switch);
		
		var vDevTSensorValue = vDevTSensor.get("metrics:level"),
		vDevSwitchValue = vDevSwitch.get("metrics:level");
	
		if (!self.isEnabledManualMode) {
			if (!self.isTurnedOnViaLight) {
				if (vDevTSensorValue > self.config.degree) {
					if (vDevSwitchValue !== "on") {
						vDevSwitch.performCommand("on");
						console.log("---  DBG[FanManager_" + self.id + "]: Sensor's temperature is changed. It's value is more than " + self.config.degree + " (current value is: " + vDevTSensorValue + "). Fan is turned ON.");
						self.isTurnedOnViaTemperatureSensor = true;
					} else {
						self.debug_log("Sensor's temperature is changed. It's value is more than " + self.config.degree + " (current value is: " + vDevTSensorValue + "), but fan is already ON. Nothing to do.");
					}
				} else if (vDevTSensorValue < self.config.degree) {
					if (vDevSwitchValue !== "off") {
						vDevSwitch.performCommand("off");
						console.log("---  DBG[FanManager_" + self.id + "]: Sensor's temperature is changed. It's value is lower than " + self.config.degree + " (current value is: " + vDevTSensorValue + "). Fan is turned OFF.");
						self.isTurnedOnViaTemperatureSensor = false;
					} else {
						self.debug_log("Sensor's temperature is changed. It's value is lower than " + self.config.degree + " (current value is: " + vDevTSensorValue + "), but fan is already OFF. Nothing to do.");
					}
				}	
			} else {
				self.debug_log("Temperature sensor is triggered, but fan is currently switched on by the light. Nothing to do.");
			}
		} else {
			self.debug_log("Temperature sensor is triggered, but manual mode is currently turned on. Nothing to do.");
		}
	};

	this.checkLight = function() {
		var vDevTSensor = self.controller.devices.get(self.config.temperatureSensor),
		vDevLight = self.controller.devices.get(self.config.light),
		vDevSwitch = self.controller.devices.get(self.config.switch);

		var vDevLightValue = vDevLight.get("metrics:level"),
		vDevSwitchValue = vDevSwitch.get("metrics:level");

		if (vDevLightValue > 0) {
			self.debug_log("Light changed state to on. Nothing to do.");
		} else {
			self.isEnabledManualMode = false;
			console.log("---  DBG[FanManager_" + self.id + "]: Manual mode is disabled.");
			if (!self.isTurnedOnViaTemperatureSensor) {
				self.debug_log("Light changed state to OFF. Checking fan state..");
				if (vDevSwitchValue !== "on") {
					vDevSwitch.performCommand("on");
					console.log("---  DBG[FanManager_" + self.id + "]: Fan is turned on for " + self.config.endtime + " min.");
					self.isTurnedOnViaLight = true;
					self.clear_timeout(self.timeoutTimer);

					self.timeoutTimer = setTimeout (function () {
						if ((vDevSwitch.get("metrics:level") !== "off") && (vDevTSensor.get("metrics:level") < self.config.degree)) {
							vDevSwitch.performCommand("off");
							console.log("---  DBG[FanManager_" + self.id + "]: Timer is ended. Fan is turned OFF.");
						} else if ((vDevSwitch.get("metrics:level") !== "off") && (vDevTSensor.get("metrics:level") > self.config.degree)) {
							self.debug_log("Timer is ended, but temperature sensor value is still more than " + self.config.degree + " (current value is: " + vDevTSensor.get("metrics:level") + "). Nothing to do.");
						} else {
							self.debug_log("Timer is ended, but fan is already OFF. Nothing to do.");
						}
						self.isTurnedOnViaLight = false;
					}, self.config.endtime * 60 * 1000);
					self.debug_log("Timer is started for " + self.config.endtime + " min..");
				} else {
					self.debug_log("Fan is already ON. Nothing to do.");
				}
			} else {
				self.debug_log("Light is triggered, but fan is currently switched on by the temparature sensor. Nothing to do.");
			}
			
		}
	};

	this.manualMode = function () {
		self.debug_log("Manual mode is triggered");
		var vDevLight = self.controller.devices.get(self.config.light),
		vDevScene = self.controller.devices.get(self.config.scene),
		vDevSwitch = self.controller.devices.get(self.config.switch);

		var vDevLightValue = vDevLight.get("metrics:level"),
		vDevSceneValue = vDevScene.get("metrics:level"),
		vDevSwitchValue = vDevSwitch.get("metrics:level");

		if (vDevSceneValue === self.config.sceneValue) {
			self.isTurnedOnViaTemperatureSensor = false;
			self.isTurnedOnViaLight = false;
			self.clear_timeout(self.timeoutTimer);

			if (vDevLightValue > 0) {
				if (!self.isEnabledManualMode) {
					self.isEnabledManualMode = true;
					console.log("---  DBG[FanManager_" + self.id + "]: Manual mode is enabled.");
				}

				if (vDevSwitchValue !== "on") {
					vDevSwitch.performCommand("on");
					console.log("---  DBG[FanManager_" + self.id + "]: Fan is manually enabled.");
				} else {
					vDevSwitch.performCommand("off");
					console.log("---  DBG[FanManager_" + self.id + "]: Fan is manually disabled.");
				}
			}
		}
	}

	this.controller.devices.on(this.config.temperatureSensor, 'change:metrics:level', this.checkTemperature);
	this.controller.devices.on(this.config.light, 'change:metrics:level', this.checkLight);
	this.controller.devices.on(this.config.scene, 'change:metrics:level', this.manualMode);	
};

FanManager.prototype.stop = function () {
	FanManager.super_.prototype.stop.call(this);
	
	var self = this;

	this.controller.devices.off(this.config.temperatureSensor, 'change:metrics:level', this.checkTemperature);
	this.controller.devices.off(this.config.light, 'change:metrics:level', this.checkLight);
	this.controller.devices.off(this.config.scene, 'change:metrics:level', this.manualMode);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

FanManager.prototype.debug_log = function (msg) {
	if (this.config.debug) {
		console.log("---  DBG[FanManager_" + this.id + "]: " + msg);
	}
}

FanManager.prototype.clear_timeout = function (timerInstance) {
	if (timerInstance) {
		this.debug_log("Found existing timeout timer. Clearing it..");
		clearTimeout(timerInstance);
	}
}