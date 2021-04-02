// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function TestDevice (id, controller) {
	// Call superconstructor first (AutomationModule)
	TestDevice.super_.call(this, id, controller);
}

inherits(TestDevice, AutomationModule);

_module = TestDevice;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

TestDevice.prototype.init = function (config) {
	TestDevice.super_.prototype.init.call(this, config);

	var self = this,
		icon = "",
		level = "",
		deviceType = this.config.deviceType,
		probeType = "",
		min = "",
		max = ""
		
	switch(deviceType) {
		case "sensorMultilevel":
			icon = "temperature";
			probeType = "temperature";
			level = this.config.minlevel;
			break;
		case "thermostat":
			icon = "thermostat";
			probeType = "thermostat_set_point";
			level = 18;
			min = 10;
			max = 30;
			break;
	}
	
	var defaults = {
		metrics: {
			title: self.getInstanceTitle()
		}
	};
	
	var overlay = {
			deviceType: deviceType,
			probeType: probeType,
			metrics: {
				icon: icon,
				probeType: probeType,
				level: level,
				min: min,
				max: max
			}	  
	};

	this.vDev = self.controller.devices.create({
		deviceId: "TestDevice_" + deviceType + "_" + this.id,
		defaults: defaults,
		overlay: overlay,
		handler: function (command, args) {
			var vDevType = deviceType;

			if (vDevType === "thermostat") {
				self.vDev.set("metrics:level", parseInt(args.level, 10));
			}
			
		},
		moduleId: this.id
	});
		
	if (deviceType === "sensorMultilevel") {
		this.isGoingToMax = true;
		this.timer = setInterval(function() {
			self.update(self.vDev);
		}, this.config.updatetime * 1000);
	}
};


TestDevice.prototype.stop = function () {
	if (this.timer) {
		clearInterval(this.timer);
	}
	if (this.vDev) {
		this.controller.devices.remove("TestDevice_" + this.config.deviceType + "_" + this.id);
		this.vDev = null;
	}
	TestDevice.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

TestDevice.prototype.update = function (vDev) {
	if (this.isGoingToMax) {
		if(vDev.get("metrics:level") === this.config.maxlevel) {
			this.isGoingToMax = false;
		} else {
			vDev.set("metrics:level", vDev.get("metrics:level") + 0.5);
			this.debug_log("Temperature changed to " + vDev.get("metrics:level"));
		}
	} else {
		if(vDev.get("metrics:level") === this.config.minlevel) {
			this.isGoingToMax = true;
		} else {
			vDev.set("metrics:level", vDev.get("metrics:level") - 0.5);
			this.debug_log("Temperature changed to " + vDev.get("metrics:level"));
		}
	}

};

TestDevice.prototype.debug_log = function (msg) {
	if (this.config.debug) {
		console.log("---  DBG[TestDevice_" + this.config.deviceType + "_" + this.id + "]: " + msg);
	}
};