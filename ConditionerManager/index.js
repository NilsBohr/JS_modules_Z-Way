// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function ConditionerManager (id, controller) {
	// Call superconstructor first (AutomationModule)
	ConditionerManager.super_.call(this, id, controller);
}

inherits(ConditionerManager, AutomationModule);

_module = ConditionerManager;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

ConditionerManager.prototype.init = function (config) {
	ConditionerManager.super_.prototype.init.call(this, config);

	var self = this;

	this.vDev = this.controller.devices.create({
		deviceId: this.getName() + '_' + this.id,
		defaults: {
			deviceType: 'switchBinary',
			metrics: {
				icon: 'switch',
				level: 'off',
				title: this.getInstanceTitle()
			}
		},
		overlay: {},
		handler: function(command) {
			if (command != 'update') {
				if (command === 'on') {
					self.vDev.set('metrics:level', command);
					zway.devices[self.config.nodeId].instances[self.config.instanceId].commandClasses[self.config.commandClassId].Set(5);
				} else if (command === 'off') {
					self.vDev.set('metrics:level', command);
					zway.devices[self.config.nodeId].instances[self.config.instanceId].commandClasses[self.config.commandClassId].Set(0);
				}
			}
		},
		moduleId: this.id
	});
};

ConditionerManager.prototype.stop = function () {
	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}

	ConditionerManager.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

ConditionerManager.prototype.debug_log = function (msg) {
	if (this.debugState === true) {
		console.log('---  DBG[ConditionerManager_' + this.id + msg);
	}
}