/*** DeadMonitor Z-Way HA module *******************************************

Version: 1.0.0
(c) Senseloop, 2016
-----------------------------------------------------------------------------
Author: Selednikov Nikita <sne@z-wave.me>
Description:
    Monitors devices to detect loss of communication with them
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DeadMonitor (id, controller) {
    // Call superconstructor first (AutomationModule)
    DeadMonitor.super_.call(this, id, controller);
}

inherits(DeadMonitor, AutomationModule);

_module = DeadMonitor;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

DeadMonitor.prototype.init = function (config) {
    DeadMonitor.super_.prototype.init.call(this, config);

    var self = this;

    // save hour divider
    self.hourDivider = self.config.interval;


    // set up cron handler
    self.controller.on("deadMonitor.poll", self.onPoll);

    // add cron schedule every every hour
    self.controller.emit("cron.addTask", "deadMonitor.poll", {
        minute: 0,
        hour: null,
        weekDay: null,
        day: null,
        month: null
    });
}

DeadMonitor.prototype.stop = function () {
    var self = this;
    DeadMonitor.super_.prototype.stop.call(this);
    
    self.controller.emit("cron.removeTask", "deadMonitor.poll");
    self.controller.off("deadMonitor.poll", self.onPoll);
}

// module functions

// var bindVar = zway.devices[9].data.lastReceived.bind( function() {
//     	console.log("triggered");
//     });

DeadMonitor.prototype.onPoll = function () {
	console.log("deadMonitor polled");

	for(var deviceIndex in zway.devices) {
		console.log(deviceIndex);

		if (deviceIndex == "1") {
			console.log("it's a controller, skip");
			continue;
		}

		if (zway.devices[deviceIndex].data.isListening.value == true) {
			console.log("it's an always on node");
			zway.devices[deviceIndex].SendNoOperation();
		} else {
			console.log("it's a sleeping node");
		}	
	}
}