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
	this.debugState = this.config.debug;
	
	this.checkCondition = function () {
		if (self.intervalTimer) {
			clearInterval("}:" + self.intervalTimer);
		}

		if (self.timeoutTimer) {
			clearTimeout(self.timeoutTimer);
		}
		
		self.intervalCounter = 0;
		self.debug_log("]: Starting interval timer..");
		self.intervalTimer = setInterval(function () {
			self.debug_log("]: Interval is on step: " + self.intervalCounter);
			self.debug_log("]: Sending a command to request devices status update..");
			
			var managedDevice = self.controller.devices.get(self.config.managedDevice),
			trackedDevice = self.controller.devices.get(self.config.trackedDevice);
			
			managedDevice.performCommand("update");
			trackedDevice.performCommand("update");

			self.debug_log("]: Setting timeout timer on 5 sec. Checking sensors state..");
			self.timeoutTimer = setTimeout(function () {
				self.debug_log("]: Timeout is ended! Getting devices states..");
				var managedDeviceValue = managedDevice.get("metrics:level");
				var trackedDeviceValue = trackedDevice.get("metrics:level");

				self.debug_log("]: Switch current state is: " + managedDeviceValue);
				self.debug_log("]: Sensor current state is: " + trackedDeviceValue);

				if (((trackedDeviceValue == "on") && (managedDeviceValue == "off"))) {
					self.debug_log("]: Condition is checked! Changing managed device state to ON..");
					managedDevice.performCommand("on");
				} else if (((trackedDeviceValue == "off") && (managedDeviceValue == "on"))) {
					self.debug_log("]: Condition is checked! Changing managed device state to OFF..");
					managedDevice.performCommand("off");
				} else {
					self.debug_log("]: Condition is checked! Nothing to do.");
				}
			}, 5 * 1000);
		
			self.intervalCounter++;
			
			if (self.intervalCounter > 29) {
			self.debug_log("]: Job is done! Clearing interval timer..");
			clearInterval(self.intervalTimer);
			}	
		}, 60 * 1000);
	}

	this.controller.devices.on(this.config.daylight, "change:metrics:level", this.checkCondition);
};

BindDeviceStatus.prototype.stop = function () {
	if (this.intervalTimer) {
		clearInterval(this.intervalTimer);
	}

	if (this.timeoutTimer) {
		clearTimeout(this.timeoutTimer);
	}
	
	this.controller.devices.off(this.config.daylight, "change:metrics:level", this.checkCondition);

	BindDeviceStatus.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

BindDeviceStatus.prototype.debug_log = function (msg) {
	if (this.debugState === true) {
		console.log("---  DBG[BindingDeviceStatus_" + this.id + msg);
	}
}