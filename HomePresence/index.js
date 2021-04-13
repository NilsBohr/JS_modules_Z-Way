/*** Network Presence Z-Way HA module ****************************************
Version: 0.5
------------------------------------------------------------------------------
Author: Kjetil Volden
Description:
    This module is used for pinging one or more network devices and determine
    their presence.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function HomePresence(id, controller){
    // Call superconstructor first (AutomationModule)
    HomePresence.super_.call(this, id, controller);
    this.icon_path  = '/ZAutomation/api/v1/load/modulemedia/HomePresence/';
    this.addrs = [];
    this.motionSensors = [];
    this.default_advanced_config = {interval: 1,
                                    netcat_port: 80,
                                    motion_timeout: 1,
                                    debug_logging: false};
    this.crontask_name = undefined;
    this.langfile = this.controller.loadModuleLang('HomePresence');
}

inherits(HomePresence, AutomationModule);

_module = HomePresence;


// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

HomePresence.prototype.init = function (config){
    config.advanced_config = _.extend({}, this.default_advanced_config, config.advanced_config);

    HomePresence.super_.prototype.init.call(this, config);

    var self = this;
    this.debug_log = _.bind(this.debug_log, self);

    var dev_id = 'HomePresence_' + self.id;
    var dev_title = 'Home presence status';
    this.vDevPresence = this.controller.devices.create({
        deviceId: dev_id,
        defaults: {
        deviceType: 'sensorBinary',
            metrics: {
                level: 'off',
                icon: self.icon_path + 'icon.png',
                title: dev_title
            }
        },
        overlay: {},
        handler: function (){},
        moduleId: self.id
    });

    this.poll_addr = function () {
        try {
            self.isAddrAlive = false;
            self.addrs.forEach(function (addr, index) {
                var p = self.config.advanced_config.netcat_port;
                var response = system('netcat -v -z -w ' + '10' + ' ' + addr + ' ' + p + ' 2>&1');

                self.isAddrAlive = self.isAddrAlive || (response[1].indexOf('No route to host') == -1 && (response[1].indexOf('Operation now in progress') == -1));
                (response[1].indexOf('No route to host') == -1 && (response[1].indexOf('Operation now in progress') == -1)) ? self.debug_log(addr + ' is present. Command output: ' + response[1].slice(0,-1)) : self.debug_log(addr + ' is absent. Command output: ' + response[1].slice(0,-1));
                    
                if (self.isAddrAlive) {
                    if (this.motionTimeout) {
                        clearTimeout(this.motionTimeout);
                    }

                    if (self.vDevPresence.get('metrics:level') === 'off') {
                        self.vDevPresence.set('metrics:level', 'on');
                    }
                }
                    
                if (!self.isAddrAlive && !self.isMotionPresent && (index === (self.addrs.length - 1))) {
                    if (self.vDevPresence.get('metrics:level') === 'on') {
                        self.vDevPresence.set('metrics:level', 'off');
                    }
                    self.debug_log('Presence is not detected!');
                }
                
                if (self.isAddrAlive && (index === (self.addrs.length - 1))) {
                    self.debug_log('Presence detected!');
                }
            });
        }
        catch(err){
            var msg = 'Home Presence: No permissions to run netcat. Add command "netcat" (without quotes) to .syscommands file.';
            self.controller.addNotification(
                'error',
                msg,
                'module',
                'HomePresence'
            );
            self.debug_log('Polling failed, check syscommands');
            return;
        }
    };

    this.config.network_addresses.forEach(function(item) {
        self.addrs.push(item.addr);
    });

    var crontime = {minute: [0, 59, config.advanced_config.interval],
        hour: null,
        weekDay: null,
        day: null,
        month: null};

    this.crontask_name = 'HomePresence_' + self.id + '.poll';
    this.controller.emit('cron.addTask', this.crontask_name, crontime);
    this.controller.on(this.crontask_name, this.poll_addr);

    this.poll_addr();

    if (this.motionTimeout) {
        clearTimeout(this.motionTimeout);
    }

    this.checkMotion = function () {
        self.isMotionPresent = false;
        self.motionSensors.forEach(function(item, index) {
            var motionSensor = self.controller.devices.get(item);
            self.isMotionPresent = self.isMotionPresent || motionSensor.get('metrics:level') === 'on' ? true : false;
            motionSensor.get('metrics:level') === 'on'  ? self.debug_log(motionSensor.deviceId + ' is present') : self.debug_log(motionSensor.deviceId + ' is absent');
            if (self.isMotionPresent) {
                if (this.motionTimeout) {
                    clearTimeout(this.motionTimeout);
                }

                if (self.vDevPresence.get('metrics:level') === 'off') {
                    self.vDevPresence.set('metrics:level', 'on');
                }
            }
                
            if (!self.isMotionPresent && !self.isAddrAlive && (index === (self.addrs.length - 1))) {
                if (!self.motionTimeout) {
                    self.motionTimeout = setTimeout(function () {
                        if (self.vDevPresence.get('metrics:level') === 'on') {
                            self.vDevPresence.set('metrics:level', 'off');
                        }
                    }, config.advanced_config.motion_timeout * 60 * 60 * 1000);
                }
                self.debug_log('Motion is absent!');
            } 
            
            if (self.isMotionPresent && (index === (self.addrs.length - 1))) {
                self.debug_log('Motion is present!');
            }
        });
    }

    this.config.motion_sensors.forEach(function(dev) {
        self.motionSensors.push(dev.motion_sensor);
        self.controller.devices.on(dev.motion_sensor, 'change:metrics:level', self.checkMotion);
    });
};


// ----------------------------------------------------------------------------
// --- Module instance stopped
// ----------------------------------------------------------------------------

HomePresence.prototype.stop = function (){
    HomePresence.super_.prototype.stop.call(this);
    
    var self = this;

    this.controller.devices.remove(this.vDevPresence);
    this.addrs = [];
    this.motionSensors = [];
    this.controller.emit('cron.removeTask', this.crontask_name);
    this.controller.off(this.crontask_name, this.poll_addr);

    if (this.timeoutTimer) {
        clearTimeout(this.motionTimeout);
    }

    this.config.motion_sensors.forEach(function(dev) {
        self.controller.devices.off(dev.motion_sensor, 'change:metrics:level', self.checkMotion);
    });
};

// ----------------------------------------------------------------------------
// --- Logging for debugging purposes
// ----------------------------------------------------------------------------

HomePresence.prototype.debug_log = function (msg){
    if(this.config.advanced_config.debug_logging){
        console.log('[HomePresence] ' + msg);
    }
};
