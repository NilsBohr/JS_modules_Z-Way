// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function CustomFloorHeating (id, controller) {
	// Call superconstructor first (AutomationModule)
	CustomFloorHeating.super_.call(this, id, controller);
}

inherits(CustomFloorHeating, AutomationModule);

_module = CustomFloorHeating;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

CustomFloorHeating.prototype.init = function (config) {
	CustomFloorHeating.super_.prototype.init.call(this, config);

	var self = this;

	/**** TRANSFORM OLD CONFIG FROM 2.1.2 TO 2.2.1 VERSION ****/
	var needToSaveConfig = false;

	if (self.config.switches) {
		self.config.devices.switches = self.config.switches;
		delete self.config.switches;
		needToSaveConfig = true;
	}
	if (needToSaveConfig) {
		self.saveConfig();
	}
	/***********************************************************/

	this.runOnScene = function() {
		// to do
	};

	this.runOffScene = function() {
		// to do
	};

	// set up cron handler
	this.controller.on("CustomFloorHeating.starttime.run."+self.id, this.runOnScene);
	this.controller.on("CustomFloorHeating.endtime.run."+self.id, this.runOffScene);

	// add cron schedule
	var wds = this.config.weekdays.map(function(x) { return parseInt(x, 10); });
	
	if (wds.length == 7) {
		wds = [null]; // same as all - hack to add single cron record. NB! changes type of wd elements from integer to null
	}

	wds.forEach(function(wd) {
		self.controller.emit("cron.addTask", "CustomFloorHeating.starttime.run."+self.id, {
			minute: parseInt(self.config.starttime.split(":")[1], 10),
			hour: parseInt(self.config.starttime.split(":")[0], 10),
			weekDay: wd,
			day: null,
			month: null
		});
	});

	wds.forEach(function(wd) {
		self.controller.emit("cron.addTask", "CustomFloorHeating.endtime.run."+self.id, {
			minute: parseInt(self.config.endtime.split(":")[1], 10),
			hour: parseInt(self.config.endtime.split(":")[0], 10),
			weekDay: wd,
			day: null,
			month: null
		});
});
};

CustomFloorHeating.prototype.stop = function () {
	CustomFloorHeating.super_.prototype.stop.call(this);

	this.controller.emit("cron.removeTask", "CustomFloorHeating.starttime.run."+this.id);
	this.controller.off("CustomFloorHeating.starttime.run."+this.id, this.runOnScene);

	this.controller.emit("cron.removeTask", "CustomFloorHeating.endtime.run."+this.id);
	this.controller.off("CustomFloorHeating.endtime.run."+this.id, this.runOffScene);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
