// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DevicesPolling (id, controller) {
	// Call superconstructor first (AutomationModule)
	DevicesPolling.super_.call(this, id, controller);
}

inherits(DevicesPolling, AutomationModule);

_module = DevicesPolling;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

DevicesPolling.prototype.init = function (config) {
	DevicesPolling.super_.prototype.init.call(this, config);

	var self = this;
	this.debugState = this.config.debug;
	this.garageDaylight = this.controller.devices.get(this.config.garageDaylight);
	this.householdDaylight = this.controller.devices.get(this.config.householdDaylight);
	
	if (this.intervalTimer) {
		this.debug_log("]: Interval timer is already exist! Clearing interval timer..");
		clearInterval(this.intervalTimer);
	}

	this.debug_log("]: Module is started! Starting interval timer..");
	this.intervalTimer = setInterval(function () {
		self.debug_log("]: Interval timer is ended. Updating devices status..");
		self.garageDaylight.performCommand("update");
		self.householdDaylight.performCommand("update");
	}, this.config.interval * 60 * 10000)
		
};

DevicesPolling.prototype.stop = function () {
	
	if (this.intervalTimer) {
		this.debug_log("]: Module is stopped! Clearing interval timer..");
		clearInterval(this.intervalTimer);
	}

	DevicesPolling.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

DevicesPolling.prototype.debug_log = function (msg) {
	if (this.debugState === true) {
		console.log("---  DBG[BindingDeviceStatus_" + this.id + msg);
	}
}