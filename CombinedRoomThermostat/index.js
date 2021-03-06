// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function CombinedRoomThermostat (id, controller) {
	// Call superconstructor first (AutomationModule)
	CombinedRoomThermostat.super_.call(this, id, controller);
}

inherits(CombinedRoomThermostat, AutomationModule);

_module = CombinedRoomThermostat;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

CombinedRoomThermostat.prototype.init = function (config) {
	CombinedRoomThermostat.super_.prototype.init.call(this, config);
	var self = this;
	
	// Creating master thermostat
	this.vDev = this.controller.devices.create({
		deviceId: "CombinedRoomThermostat_" + this.id,
		defaults: {
			deviceType: "thermostat",
			probeType: "thermostat_set_point",
			metrics: {
				scaleTitle: '°C',
				level: 22,
				min: 10,
				max: 30,
				icon: "thermostat",
				title: self.getInstanceTitle()
			}
		},
		overlay: {},
		handler: function (command, args) {
			self.vDev.set("metrics:level", parseInt(args.level, 10));
			self.checkThermostatsTemp();
            self.manualACcommand = true;
			self.performAirConditioner();
		},
		moduleId: this.id
	});

	// Handling slave thermostats temperature
	this.checkThermostatsTemp = function () {
		var temperatureSensor = self.controller.devices.get(self.config.temperatureSensor),
		weatherSensor = self.controller.devices.get(self.config.weatherSensor),
		presenceSwitch = self.controller.devices.get(self.config.presenceSwitch),
		mainThermostat = self.vDev;
	
		var temperatureSensorValue = temperatureSensor.get("metrics:level"),
		weatherSensorValue = weatherSensor.get("metrics:level"),
		presenceSwitchValue = presenceSwitch.get("metrics:level"),
		mainThermostatValue = mainThermostat.get("metrics:level"),
		delta = self.config.delta;
		
		if (weatherSensorValue < 5) {
			if (presenceSwitchValue === "on") {
				if ((temperatureSensorValue > (mainThermostatValue + delta)) && (global.climatState != "cooling")) {
					self.info_log("Sensor's temperature changed and is too hot (current temperature value is " + temperatureSensorValue + ", termostat value is " + mainThermostatValue + "). Setting thermostats temperature to 10 degree");
					global.climatState = "cooling";
					self.config.thermostats.forEach(function(dev) {
						var vDevX = self.controller.devices.get(dev.device);
						if (vDevX && vDevX.get("metrics:level") !== 10) {
							vDevX.performCommand("exact", {level : 10});
						}
					});
				} else if ((temperatureSensorValue < (mainThermostatValue - delta)) && (global.climatState != "heating")) {
					self.info_log("Sensor's temperature changed and is too cold (current temperature value is " + temperatureSensorValue + ", termostat value is " + mainThermostatValue + "). Setting thermostats temperature to 30 degree");
					global.climatState = "heating";
					self.config.thermostats.forEach(function(dev) {
						var vDevX = self.controller.devices.get(dev.device);
						if (vDevX && vDevX.get("metrics:level") !== 30) {
							vDevX.performCommand("exact", {level : 30});
						}
					});
				} else {
					self.debug_log("Sensor's temperature changed, but it is in normal range. Nothing to do.");
				}
			} else {
				if (global.climatState != "cooling") {
					self.info_log("Nobody is at home. Setting thermostats temperature to 10 degree");
					global.climatState = "cooling";
					self.config.thermostats.forEach(function(dev) {
						var vDevX = self.controller.devices.get(dev.device);
						if (vDevX && vDevX.get("metrics:level") !== 10) {
							vDevX.performCommand("exact", {level : 10});
						}
					});
				}
			}
		}		
	};

	this.controller.devices.on(this.config.temperatureSensor, 'change:metrics:level', self.checkThermostatsTemp);
	this.controller.devices.on(this.config.presenceSwitch, 'change:metrics:level', self.checkThermostatsTemp);
	

	// handling time conditions if exist
	if (this.config.useTime) {
		this.perfromFirstCondition = function () {
			if (self.vDev.get("metrics:level") !== self.config.firstDegreeCondition) {
				self.vDev.performCommand("exact", {level : self.config.firstDegreeCondition});
				self.debug_log("First time condition is triggered. Master thermostat value changed to " + self.config.firstDegreeCondition);
			}
		};

		this.perfromSecondCondition = function () {
			if (self.vDev.get("metrics:level") !== self.config.secondDegreeCondition) {
				self.vDev.performCommand("exact", {level : self.config.secondDegreeCondition});
				self.debug_log("Second time condition is triggered. Master thermostat value changed to " + self.config.secondDegreeCondition);
			}
		};

		this.controller.on("CombinedRoomThermostat.first.run." + this.id, this.perfromFirstCondition);
		this.controller.on("CombinedRoomThermostat.second.run." + this.id,this.perfromSecondCondition);

		this.controller.emit("cron.addTask", "CombinedRoomThermostat.first.run." + this.id, {
			minute: parseInt(this.config.firstTimeCondition.split(":")[1], 10),
			hour: parseInt(this.config.firstTimeCondition.split(":")[0], 10),
			weekDay: null,
			day: null,
			month: null
		});
		this.controller.emit("cron.addTask", "CombinedRoomThermostat.second.run." + this.id, {
			minute: parseInt(this.config.secondTimeCondition.split(":")[1], 10),
			hour: parseInt(this.config.secondTimeCondition.split(":")[0], 10),
			weekDay: null,
			day: null,
			month: null
		});
	}

	//handling air conditioner if exist
	if (this.config.useAirConditioner) {
		this.performAirConditioner = function () {

			var daylightSensor = self.controller.devices.get(self.config.daylightSensor),
			temperatureSensor = self.controller.devices.get(self.config.temperatureSensor),
			weatherSensor = self.controller.devices.get(self.config.weatherSensor),
			presenceSwitch = self.controller.devices.get(self.config.presenceSwitch),
			airConditionerSwitch = self.controller.devices.get(self.config.airConditionerSwitch),
			airConditionerThermostat = self.controller.devices.get(self.config.airConditionerThermostat),
			mainThermostat = self.vDev;
	
			var daylightSensorValue = daylightSensor.get("metrics:level"),
			temperatureSensorValue = temperatureSensor.get("metrics:level"),
			weatherSensorValue = weatherSensor.get("metrics:level"),
			presenceSwitchValue = presenceSwitch.get("metrics:level"),
			mainThermostatValue = mainThermostat.get("metrics:level");
	
			if (weatherSensorValue > 5) {
				if (daylightSensorValue === "off") {
					if (temperatureSensorValue > (mainThermostatValue + self.config.delta)) {
						if (presenceSwitchValue === "on") {
							if ((!self.airConTimeoutStarted) || (self.manualACcommand)) {
								self.manualACcommand = false;
	
								var new_value = Math.floor(mainThermostatValue);
								if (new_value < 18) {
									new_value = 18;
								} else if (new_value > 27) {
									new_value = 27;
								}
								self.info_log("Thermostat = " + mainThermostatValue + ". Temperature = " + temperatureSensorValue + ". AC set to " + new_value + " for " + self.config.airConditionerTimeCondition + "hour(s)");
								airConditionerThermostat.performCommand("exact", {level : new_value});
									
			                    self.airConTimeoutStarted = true;
								self.airConTimeout = setTimeout(function () {
				                    self.airConTimeoutStarted = false;
									airConditionerSwitch.performCommand("on");
									self.info_log("Timer ended. AC is turned OFF");
								}, self.config.airConditionerTimeCondition * 60 * 60 * 1000);
		
							}
						}
					} else {
			            if (self.airConTimeoutStarted) {
			                clearTimeout(self.airConTimeout);
			                self.airConTimeoutStarted = false;

							airConditionerSwitch.performCommand("on");
							self.debug_log("Thermostat = " + mainThermostatValue + ". Temperature = " + temperatureSensorValue + ". AC is turned OFF");
			            }

			            if (self.manualACcommand) {
			            	self.manualACcommand = false;
							airConditionerSwitch.performCommand("on");
							self.debug_log("AC is manually turned OFF");
			            }
					}
				}
			}
		};
	
		this.controller.devices.on(this.config.daylightSensor, 'change:metrics:level', this.performAirConditioner);
		this.controller.devices.on(this.config.presenceSwitch, 'change:metrics:level', this.performAirConditioner);
		this.controller.devices.on(this.config.temperatureSensor, 'change:metrics:level', this.performAirConditioner);
	}
	
	//handling curtain if exist
	if (this.config.useCurtain) {
		this.performCurtain = function () {
			var daylightSensor = self.controller.devices.get(self.config.daylightSensor),
			temperatureSensor = self.controller.devices.get(self.config.temperatureSensor),
			weatherSensor = self.controller.devices.get(self.config.weatherSensor),
			presenceSwitch = self.controller.devices.get(self.config.presenceSwitch),
			curtain = self.controller.devices.get(self.config.curtain);
	
			var daylightSensorValue = daylightSensor.get("metrics:level"),
			temperatureSensorValue = temperatureSensor.get("metrics:level"),
			weatherSensorValue = weatherSensor.get("metrics:level"),
			presenceSwitchValue = presenceSwitch.get("metrics:level"),
			curtainValue = curtain.get("metrics:level");
	
	
			if (weatherSensorValue > 5) {
				if (daylightSensorValue === "off") {
					if (temperatureSensorValue > self.config.curtainDegreeCondition) {
						if (presenceSwitchValue === "off") {
							self.debug_log("Nobody is at home, but temperature is too high (current value is:"+ temperatureSensorValue + "). Performing curtain...");
							if (curtainValue !== self.config.curtainLevel) {
								curtain.performCommand("exact", {level : self.config.curtainLevel});
								self.info_log("Curtain level is set to " + self.config.curtainLevel);
							} else {
								self.debug_log("Curtain is already at level " + self.config.curtainLevel);
							}
						}
					}
				}
			}
		};
	
		this.controller.devices.on(this.config.daylightSensor, 'change:metrics:level', this.performCurtain);
		this.controller.devices.on(this.config.temperatureSensor, 'change:metrics:level', this.performCurtain);
	}

};

CombinedRoomThermostat.prototype.stop = function () {
	CombinedRoomThermostat.super_.prototype.stop.call(this);
	
	var self = this;

	this.controller.devices.off(this.config.temperatureSensor, 'change:metrics:level', this.checkThermostatsTemp);

	if (this.config.useTime) {
		this.controller.emit("cron.removeTask", "CombinedRoomThermostat.first.run." + this.id);
		this.controller.off("CombinedRoomThermostat.first.run." + this.id, this.perfromFirstCondition);
		this.controller.emit("cron.removeTask", "CombinedRoomThermostat.second.run." + this.id);
		this.controller.off("CombinedRoomThermostat.second.run." + this.id,this.perfromSecondCondition);
	}

	if (this.config.useAirConditioner) {
	    if (this.airConTimeoutStarted) {
	        clearTimeout(this.airConTimeout);
	        self.airConTimeoutStarted = false;
	    }

		this.controller.devices.off(this.config.daylightSensor, 'change:metrics:level', this.performAirConditioner);
		this.controller.devices.off(this.config.temperatureSensor, 'change:metrics:level', this.performAirConditioner);
	}

	if (this.config.useCurtain) {
		this.controller.devices.off(this.config.daylightSensor, 'change:metrics:level', this.performCurtain);
		this.controller.devices.off(this.config.temperatureSensor, 'change:metrics:level', this.performCurtain);
	}

	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

CombinedRoomThermostat.prototype.debug_log = function (msg) {
	if (this.config.debug) {
		console.log("[CombinedRoomThermostat_" + this.id + "]: " + msg);
	}
};

CombinedRoomThermostat.prototype.info_log = function (msg){
    console.log("[CombinedRoomThermostat_" + this.id + "]: " + msg);
};