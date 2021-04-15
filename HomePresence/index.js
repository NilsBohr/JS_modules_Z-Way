// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function HomePresence(id, controller){
    // Call superconstructor first (AutomationModule)
    HomePresence.super_.call(this, id, controller);
    this.icon_path  = '/ZAutomation/api/v1/load/modulemedia/HomePresence/';
}

inherits(HomePresence, AutomationModule);

_module = HomePresence;


// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

HomePresence.prototype.init = function (config){
    HomePresence.super_.prototype.init.call(this, config);
    var self = this;

    if (!this.config.interval) {
        this.config.interval = 1;
    }
    if (!this.config.netcat_port) {
        this.config.netcat_port = 80;
    }
    if (!this.config.motion_timeout) {
        this.config.motion_timeout = 1;
    }

    var dev_id = 'HomePresence_' + self.id;
    var dev_title = 'Home presence status';
    this.vDevPresence = this.controller.devices.create({
        deviceId: dev_id,
        defaults: {
        deviceType: 'switchBinary',
            metrics: {
                level: 'off',
                icon: self.icon_path + 'icon.png',
                title: dev_title
            }
        },
        overlay: {},
        handler: function (command){
            if (command != 'update') {
				this.set("metrics:level", command);
				saveObject(this.id + "_level" , command);
			}
        },
        moduleId: self.id
    });

    this.poll_addr = function () {
        try {
            self.isAddrAlive = false;
            self.config.network_addresses.forEach(function (item) {
                var addr = item.addr;

                var p = self.config.netcat_port;
                var response = system('netcat -v -z -w ' + '10' + ' ' + addr + ' ' + p + ' 2>&1');

                if (response[1].indexOf('No route to host') == -1 && (response[1].indexOf('Operation now in progress') == -1)) {
                    self.isAddrAlive = true;
                    self.debug_log(addr + ' is present');
                } else {
                    self.debug_log(addr + ' is absent');
                }
            });

            if (self.isAddrAlive) {
                if (this.motionTimeout) {
                    clearTimeout(this.motionTimeout);
                }

                if (self.vDevPresence.get('metrics:level') === 'off') {
                    self.vDevPresence.set('metrics:level', 'on');
                    self.debug_log('Presence switch changed state to ON');
                } else {
                    self.debug_log('Presence switch is already ON');
                }
            }
                
            if (!self.isAddrAlive && !self.isMotionPresent) {
                if (self.vDevPresence.get('metrics:level') === 'on') {
                    self.vDevPresence.set('metrics:level', 'off');
                    self.debug_log('Presence switch changed state to OFF');
                } else {
                    self.debug_log('Presence switch is already OFF');
                }
            }
        }
        catch(err){
            var msg = 'Home Presence: No permissions to run netcat. Add command "netcat" (without quotes) to .syscommands file.';
            self.controller.addNotification(
                'error',
                msg,
                'module',
                'HomePresence'
            );
            self.debug_log('Polling failed, check .syscommands file');
            return;
        }
    };

    var crontime = {minute: [0, 59, this.config.interval],
        hour: null,
        weekDay: null,
        day: null,
        month: null};

    this.crontask_name = 'HomePresence_' + this.id + '.poll';
    this.controller.emit('cron.addTask', this.crontask_name, crontime);
    this.controller.on(this.crontask_name, this.poll_addr);

    this.poll_addr();

    if (this.motionTimeout) {
        clearTimeout(this.motionTimeout);
    }

    this.checkMotion = function () {
        self.isMotionPresent = true;

        self.config.motion_sensors.forEach(function(dev) {
            var motionSensor = self.controller.devices.get(dev.motion_sensor);

            if (motionSensor.get('metrics:level') === 'on') {
                self.isMotionPresent = true;
                self.debug_log(motionSensor.deviceId + ' is ON');
            } else {
                self.debug_log(motionSensor.deviceId + ' is OFF');
            }
        });

        if (self.isMotionPresent) {
            if (this.motionTimeout) {
                clearTimeout(this.motionTimeout);
            }

            if (self.vDevPresence.get('metrics:level') === 'off') {
                self.vDevPresence.set('metrics:level', 'on');
                self.debug_log('Presence switch changed state to ON');
            } else {
                self.debug_log('Presence switch is already ON');
            }
        }
            
        if (!self.isMotionPresent && !self.isAddrAlive) {
            if (!self.motionTimeout) {
                self.motionTimeout = setTimeout(function () {
                    if (self.vDevPresence.get('metrics:level') === 'on') {
                        self.vDevPresence.set('metrics:level', 'off');
                        self.debug_log('Presence switch changed state to OFF');
                    } else {
                        self.debug_log('Presence switch is already OFF');
                    }
                }, self.config.motion_timeout * 60 * 60 * 1000);
            }
        } 
    }

    this.config.motion_sensors.forEach(function(dev) {
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
    this.controller.emit('cron.removeTask', this.crontask_name);
    this.controller.off(this.crontask_name, this.poll_addr);

    if (this.motionTimeout) {
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
    if(this.config.debug_logging){
        console.log('[HomePresence] ' + msg);
    }
};
