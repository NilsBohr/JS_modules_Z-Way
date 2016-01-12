/** DeadMonitor Z-Way HA module *******************************************

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


    //Polling function
	self.onPoll = function () {
		console.log("deadMonitor polled");

		for(var deviceIndex in zway.devices) {
			console.log(deviceIndex);

			if (deviceIndex == "1") {
				console.log("it's a controller, skip");
				continue;
			}

			if (zway.devices[deviceIndex].data.isListening.value === true) {
				console.log("it's an always on node");

				// Start polling session. Z-Way will handle everything else
				zway.devices[deviceIndex].SendNoOperation();
			} else {
				if (zway.devices[deviceIndex].hasOwnProperty("Wakeup")) {
					console.log("it's a sleeping node");

					var lastCommunication = zway.devices[deviceIndex].data.lastReceived.updateTime,
						wakeUpTimeInterval = zway.devices[deviceIndex].Wakeup.data.interval,
						currentTime = Math.floor(Date.now() / 1000);

					if (currentTime > (lastCommunication + wakeUpTimeInterval)) {
						// Nothing heard from the device for too long. Generate notification and bind to dataholder
						console.log("battery device seems to be dead");
						self.markBatteryDead(deviceIndex);
					}
				} else {
					console.log("it's a FLIRS node");

					//TODO add polling once a week
					zway.devices[deviceIndex].SendNoOperation();
				}
			}	
		}
	};

	//back to life function
	self.batteryDeviceBackToLife = function (type, args, self) {
		console.log("Battery device " + args.nodeId + " is not failed anymore");
		var failedArrayIndex = args.self.findNodeInFailedArray(args.nodeId);
		console.log("array found worked");
		if (failedArrayIndex < 0) {
			//something went wrong. We don't know, who is calling us
			console.log("DeadMonitor_" + args.self.id + " Bind error. Can't stop lastReceived bind, because failed array element doesn't exist");
			return;
		}
		zway.devices[args.nodeId].data.lastReceived.unbind(args.self.failedBatteryArray[failedArrayIndex].dataBind);
		console.log("unbinded js");
		// generate notification
	    args.self.controller.addNotification("notification", "Z-Wave device ID is back to life: " + args.nodeId, "connection",  "DeadMonitor_" + args.self.id);

		console.log("notification added");
	    // remove from array
		args.self.failedBatteryArray.splice(failedArrayIndex);    
		console.log("failed array removed");
	};

	// aux functions
	self.markBatteryDead = function (index) {
		if (self.findNodeInFailedArray(index) >= 0) {
			// allready failed, do nothing
			return;
		}

		var failRecord = {};
		failRecord.nodeId = index;

		console.log("add notification");
		//generate notification
	    self.controller.addNotification("error", "Connection lost to Z-Wave device ID: " + failRecord.nodeId, "connection",  "DeadMonitor_" + self.id);


		console.log("bind js");
	    //bind to dataholder
	    failRecord.dataBind = zway.devices[failRecord.nodeId].data.lastReceived.bind(self.batteryDeviceBackToLife , {self: this, nodeId: failRecord.nodeId}, false);

		console.log("update array");
		//add to failed array
		self.failedBatteryArray.push(failRecord);
	};

	self.findNodeInFailedArray = function (node) {
		// check if index is allready failed
		for(var i = 0; i < self.failedBatteryArray.length; i++) {
		    if (self.failedBatteryArray[i].nodeId == node) {
		        return i;
		    }
		}

		//not found
		return -1;
	};

    // save hour divider
    self.hourDivider = this.config.interval;

    // failed array
    self.failedBatteryArray = [];

    // set up cron handler
    self.controller.on("deadMonitor.poll", self.onPoll);

    // add cron schedule every every hour
    //TODO add hours from config
    self.controller.emit("cron.addTask", "deadMonitor.poll", {
        minute: 0,
        hour: null,
        weekDay: null,
        day: null,
        month: null
    });

    self.onPoll();
};

DeadMonitor.prototype.stop = function () {
    var self = this;
    DeadMonitor.super_.prototype.stop.call(this);
    
    self.controller.emit("cron.removeTask", "deadMonitor.poll");
    self.controller.off("deadMonitor.poll", self.onPoll);

    // unbind from all dataholders whn stopping the module
	for(var i = 0; i < self.failedBatteryArray.length; i++) {
		zway.devices[self.failedBatteryArray[i].nodeId].data.lastReceived.unbind(self.failedBatteryArray[i].dataBind);
	}
};