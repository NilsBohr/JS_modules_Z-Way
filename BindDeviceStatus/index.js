// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function BindDeviceStatus (id, controller) {
	// Call superconstructor first (AutomationModule)
	BindDeviceStatus.super_.call(this, id, controller);
}

inherits(BindDeviceStatus, AutomationModule);

_module = BindDeviceStatus;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

BindDeviceStatus.prototype.init = function (config) {
	BindDeviceStatus.super_.prototype.init.call(this, config);

	var self = this;

	var vDevSwitch = this.controller.devices.get(this.config.switch),
		vDevSensor = this.controller.devices.get(this.config.sensor);
	this.debugState = this.config.debug;
	
	this.checkCondition = function () {
		if (self.intervalTimer) {
			if (self.debugState === true) {
				console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Detected a running interval timer during function initialization. Clearing interval timer..");
			}

			clearInterval(self.intervalTimer);
		}

		if (self.timeoutTimer) {
			if (self.debugState === true) {
				console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Detected a running timeout timer during function initialization. Clearing timeout timer..");
			}

			clearTimeout(self.timeoutTimer);
		}
		
		var intervalCounter = 0;

		if (self.debugState === true) {
			console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Starting interval timer..");
		}

		self.intervalTimer = setInterval(function () {
			if (self.debugState === true) {
				console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Interval is on step: " + intervalCounter);
				console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Sending a command to request devices status update..");
			}
			
			vDevSwitch.performCommand("update");
			vDevSensor.performCommand("update");

			if (self.debugState === true) {
				console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Setting timeout timer on 3 sec. Checking sensors state..");
			}
			
			self.timeoutTimer = setTimeout(function () {
				if (self.debugState === true) {
					console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Timeout is ended! Getting devices states..");
				}

				var vDevSwitchValue = vDevSwitch.get("metrics:level");
				var vDevSensorValue = vDevSensor.get("metrics:level");

				if (self.debugState === true) {
					console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Switch current state is: " + vDevSwitchValue);
					console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Sensor current state is: " + vDevSensorValue);
				}

				if (((vDevSensorValue == "on") && (vDevSwitchValue == "off"))) {
					if (self.debugState === true) {
						console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Condition is checked! Changing vDevSwitch state to ON..");
					}

					vDevSwitch.set("metrics:level","on");
				} else if (((vDevSensorValue == "off") && (vDevSwitchValue == "on"))) {
					if (self.debugState === true) {
						console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Condition is checked! Changing vDevSwitch state to OFF..");
					}

					vDevSwitch.set("metrics:level","off");
				} else {
					if (self.debugState === true) {
						console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Condition is checked! Nothing to do.");
					}
				}
			}, 5 * 1000);
		
			intervalCounter++;
			
			if (intervalCounter > 29) {
			if (self.debugState === true) {
				console.log("---  DBG[BindingDeviceStatus_" + self.id + "]: Job is done! Clearing interval timer..");
			}

			clearInterval(self.intervalTimer);
			}	
		}, 60 * 1000);
	}

	this.controller.devices.on(this.config.daylight, "change:metrics:level", this.checkCondition);
};

BindDeviceStatus.prototype.stop = function () {
	if (this.intervalTimer) {
		if (this.debugState === true) {
			console.log("---  DBG[BindingDeviceStatus_" + this.id + "]: Module is stopped and running interval timer is detected! Clearing interval timer..");
		}

		clearInterval(this.intervalTimer);
	}

	if (this.timeoutTimer) {
		if (this.debugState === true) {
			console.log("---  DBG[BindingDeviceStatus_" + this.id + "]: Module is stopped and running timeout timer is detected! Clearing timeout timer..");
		}

		clearTimeout(this.timeoutTimer);
	}
	
	this.controller.devices.off(this.config.daylight, "change:metrics:level", this.checkCondition);

	BindDeviceStatus.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
