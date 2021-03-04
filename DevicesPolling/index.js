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
	
	this.performUpdate = function () {
		this.debug_log("]: Interval timer is ended. Updating devices status..");
		this.garageDaylight.performCommand("update");
		this.householdDaylight.performCommand("update");
	}
	
	if (this.intervalTimer) {
		this.debug_log("]: Interval timer is already exist! Clearing interval timer..");
		clearInterval(this.intervalTimer);
	}
	
	this.debug_log("]: Module is started! Starting interval timer..");
	this.intervalTimer = setInterval(this.performUpdate , this.config.interval * 60 * 1000);
		
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
		console.log("---  DBG[DevicesPolling_" + this.id + msg);
	}
}