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
				level: 18,
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
		},
		moduleId: this.id
	});

	// Handling slave thermostats temperature
	this.checkThermostatsTemp = function () {
		self.debug_log("Sensor's temperature state is changed. Checking temperature value..");
	
		var vDevSensor = self.controller.devices.get(self.config.temperatureSensor),
		vDev = self.vDev;
	
		var sensorValue = vDevSensor.get("metrics:level"),
		mainThermostatValue = vDev.get("metrics:level"),
		delta = self.config.delta;
	
		if ((sensorValue > (mainThermostatValue + delta)) && (global.climatState != "cooling")) {
			self.debug_log("Sensor's temperature is too hot. Setting thermostats temperature to 10 degree.");
			global.climatState = "cooling";
			self.config.thermostats.forEach(function(dev) {
				var vDevX = self.controller.devices.get(dev.device);
				if (vDevX && vDevX.get("metrics:level") !== 10) {
					vDevX.performCommand("exact", {level : 10});
				}
			});
		} else if ((sensorValue < (mainThermostatValue - delta)) && (global.climatState != "heating")) {
			self.debug_log("Sensor's temperature is too cold. Setting thermostats temperature to 30 degree.");
			global.climatState = "heating";
			self.config.thermostats.forEach(function(dev) {
				var vDevX = self.controller.devices.get(dev.device);
				if (vDevX && vDevX.get("metrics:level") !== 30) {
					vDevX.performCommand("exact", {level : 30});
				}
			});
		} else {
				self.debug_log("Sensor's temperature is in normal range. Nothing to do.");
		}
	};

	this.controller.devices.on(this.config.temperatureSensor, 'change:metrics:level', self.checkThermostatsTemp);

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

	//handling conditioner and curtain if exist
	if (this.config.useConditionerAndCurtain) {
		this.performConditionerAndCurtain = function () {

			var daylightSensor = self.controller.devices.get(self.config.daylightSensor),
			temperatureSensor = self.controller.devices.get(self.config.temperatureSensor),
			presenceSwitch = self.controller.devices.get(self.config.presenceSwitch),
			conditioner = self.controller.devices.get(self.config.conditioner),
			curtain = self.controller.devices.get(self.config.curtain);

			var daylightSensorValue = daylightSensor.get("metrics:level"),
			temperatureSensorValue = temperatureSensor.get("metrics:level"),
			presenceSwitchValue = presenceSwitch.get("metrics:level")
			conditionerValue = conditioner.get("metrics:level"),
			curtainValue = curtain.get("metrics:level");


			if (daylightSensorValue === "on") {
				self.debug_log("Daylight state is ON. Performing temperature check...");
				if (temperatureSensorValue > self.config.conditionerDegreeCondition) {
					self.debug_log("Temperature is too high (current value is:"+ temperatureSensorValue + "). Performing curtain and conditoner...");
					if (curtainValue !== self.config.curtainLevelCondition) {
						curtain.performCommand("exact", {level : self.config.curtainLevelCondition});
						self.debug_log("Curtain level is set to " + self.config.curtainLevelCondition);
					} else {
						self.debug_log("Curtain is already at level " + self.config.curtainLevelCondition);
					}

					if (presenceSwitchValue === "on") {
						if (conditionerValue === "off") {
							conditioner.performCommand("on");
							self.debug_log("Conditioner is enabled for " + self.config.conditionerTimeCondition + "hour(s)");
							self.conditionerTimer = setTimeout(function () {
								if (conditioner.get("metrics:level") === "on") {
									conditioner.performCommand("off");
									self.debug_log("Timer is ended. Conditioner is disabled");
								} else {
									self.debug_log("Timer is ended, but conditioner is already disabled")
								}
							}, self.config.conditionerTimeCondition * 60 * 60 * 1000);
						} else {
							self.debug_log("Conditioner is already enabled")
						}
					}
				} else {
					self.debug_log("Temperature is normal (current value is:"+ temperatureSensorValue + "). Nothing to do");
				}
			} else {
				self.debug_log("Daylight state is OFF. Nothing to do");
			}
		};


		this.controller.devices.on(this.config.daylightSensor, 'change:metrics:level', this.performConditionerAndCurtain);
		this.controller.devices.on(this.config.temperatureSensor, 'change:metrics:level', this.performConditionerAndCurtain);
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

	if (this.config.useConditionerAndCurtain) {
		this.controller.devices.off(this.config.daylightSensor, 'change:metrics:level', this.performConditionerAndCurtain);
		this.controller.devices.off(this.config.temperatureSensor, 'change:metrics:level', this.performConditionerAndCurtain);
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
		console.log("---  DBG[CombinedRoomThermostat_" + this.id + "]: " + msg);
	}
};