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

    // failed array
    self.failedBatteryArray = [];

    // set up cron handler
    self.controller.on("deadMonitor.poll", self.onPoll);

    // add cron schedule every every hour
    //!! remove debug polling
    self.controller.emit("cron.addTask", "deadMonitor.poll", {
        minute: null,
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
	var self = this;
	console.log("deadMonitor polled");

	for(var deviceIndex in zway.devices) {
		console.log(deviceIndex);

		if (deviceIndex == "1") {
			console.log("it's a controller, skip");
			continue;
		}

		if (zway.devices[deviceIndex].data.isListening.value === true) {
			console.log("it's an always on node");

			/* Start polling session. Z-Way will handle everything else*/
			zway.devices[deviceIndex].SendNoOperation();
		} else {
			if (zway.devices[deviceIndex].hasOwnProperty("Wakeup")) {
				console.log("it's a sleeping node");

				var lastCommunication = zway.devices[deviceIndex].data.lastReceived.updateTime,
					wakeUpTimeInterval = zway.devices[deviceIndex].Wakeup.data.interval,
					currentTime = Math.floor(Date.now() / 1000);

				if (currentTime > (lastCommunication + wakeUpTimeInterval)) {
					/* Nothing heard from the device for too long. Generate notification and bind to dataholder */
					console.log("battery device seems to be dead");
					self.markBatteryDead(deviceIndex);
				}
			} else {
				console.log("it's a FLIRS node");
			}
		}	
	}
}


DeadMonitor.prototype.markBatteryDead = function (index) {
	var self = this;

	if (self.findNodeInFailedArray(index) >= 0) {
		// allready failed, do nothing
		return;
	}

	var failRecord = {};
	failRecord.nodeId = index;

	//generate notification
    self.controller.addNotification("error", "Connection lost to Z-Wave device ID: " + failRecord.nodeId, "connection",  "DeadMonitor_" + self.id);


    //bind to dataholder
    failRecord.dataBind = zway.devices[failRecord.nodeId].data.lastReceived.bind(self.batteryDeviceBackToLife , failRecord.nodeId, false);

	//add to failed array
	self.failedBatteryArray.push(failRecord);
}

DeadMonitor.prototype.findNodeInFailedArray = function (node) {
	var self = this;
	// check if index is allready failed
	for(var i = 0; i < self.failedBatteryArray.length; i++) {
	    if (self.failedBatteryArray[i].nodeId == node) {
	        return i;
	    }
	}

	//not found
	return -1;
}

DeadMonitor.prototype.batteryDeviceBackToLife = function (type, arg) {
	var self = this;

	console.log("Battery device " + arg + " is not failed anymore");
	var failedArrayIndex = self.findNodeInFailedArray(arg);
	if (failedArrayIndex < 0) {
		/*something went wrong. We don't know, who is calling us */
		console.log("DeadMonitor_" + self.id + " Bind error. Can't stop lastReceived bind, because failed array element doesn't exist");
		return;
	}
	zway.devices[arg].data.lastReceived.unbind(failedBatteryArray[failedArrayIndex].dataBind);
	/* generate notification */
    self.controller.addNotification("notification", "Z-Wave device ID is back to life: 3" + arg, "connection",  "DeadMonitor_" + self.id);

    /* remove from array */
	self.failedBatteryArray.splice(failedArrayIndex);    
}

/*

{
"id": 1451900759,
"timestamp": "2016-01-04T09:45:59.287Z",
"level": "warning",
"message": "test_notification",
"type": "battery",
"source": "test_id",
"redeemed": false,
"h": -1422455832
},
{
"id": 1451900834,
"timestamp": "2016-01-04T09:47:14.741Z",
"level": "notification",
"message": "Z-Wave device ID is back to life: 3",
"type": "connection",
"source": "ZWave",
"redeemed": false,
"h": 85805683
},
{
"id": 1451901132,
"timestamp": "2016-01-04T09:52:12.135Z",
"level": "error",
"message": "Connection lost to Z-Wave device ID: 3",
"type": "connection",
"source": "ZWave",
"redeemed": false,
"h": 85805683
}
*/