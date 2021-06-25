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
                if (self.isTimerStarted) {
                    clearTimeout(self.motionTimeout);
                    self.isTimerStarted = false;
                }

                if (self.vDevPresence.get('metrics:level') === 'off') {
                    self.vDevPresence.performCommand("on");
                    self.info_log('Presence switch changed state to ON');
                } else {
                    self.debug_log('Presence switch is already ON');
                }
            }

            if (!self.isAddrAlive && !self.isMotionPresent) {
                self.checkMotion();
            }
        }
        catch(err){
            console.log('[HomePresence]: ' + err)
            var msg = 'Home Presence: No permissions to run netcat. Add command "netcat" (without quotes) to .syscommands file.';
            self.controller.addNotification(
                'error',
                msg,
                'module',
                'HomePresence'
            );
            self.info_log('Polling failed, check .syscommands file');
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

    this.checkMotion = function () {
        self.isMotionPresent = false;
        self.config.motion_sensors.forEach(function(dev) {
            var motionSensor = self.controller.devices.get(dev.motion_sensor);

            if (motionSensor.get('metrics:level') === 'on') {
                self.isMotionPresent = true;
            }
        });

        if (self.isMotionPresent) {
            if (self.motionTimeout) {
                self.printMotionStatus();
                clearTimeout(self.motionTimeout);
                self.isTimerStarted = false;
            }

            if (self.vDevPresence.get('metrics:level') === 'off') {
                self.printMotionStatus();
                self.vDevPresence.performCommand("on");
                self.info_log('Presence switch changed state to ON');
            }
        }
        
        if (!self.isTimerStarted) {
            if (!self.isMotionPresent && !self.isAddrAlive) {
                if (self.vDevPresence.get('metrics:level') !== 'off') {
                    self.printMotionStatus();
                    self.debug_log("Timer is started for " + self.config.motion_timeout + " hour(s)");
                    self.isTimerStarted = true;
                    self.motionTimeout = setTimeout(function () {
                        if (!self.isMotionPresent && !self.isAddrAlive) {
                            self.vDevPresence.performCommand("off");
                            self.info_log(self.config.motion_timeout + ' hour(s) timer is ended. Presence switch changed state to OFF');
                        }
                        self.isTimerStarted = false;
                        }, self.config.motion_timeout * 60 * 60 * 1000);
    
                } else {
                    self.debug_log('Presence switch is already OFF. No need to start timer.');
                }
            } 
        }
    }

    this.config.motion_sensors.forEach(function(dev) {
        self.controller.devices.on(dev.motion_sensor, 'change:metrics:level', self.checkMotion);
    });

    this.poll_addr();
};


// ----------------------------------------------------------------------------
// --- Module instance stopped
// ----------------------------------------------------------------------------

HomePresence.prototype.stop = function (){
    HomePresence.super_.prototype.stop.call(this);
    
    var self = this;

    if (this.isTimerStarted) {
        clearTimeout(this.motionTimeout);
        self.isTimerStarted = false;
    }

    this.controller.devices.remove(this.vDevPresence);
    this.controller.emit('cron.removeTask', this.crontask_name);
    this.controller.off(this.crontask_name, this.poll_addr);

    this.config.motion_sensors.forEach(function(dev) {
        self.controller.devices.off(dev.motion_sensor, 'change:metrics:level', self.checkMotion);
    });
};

// ----------------------------------------------------------------------------
// --- Logging for debugging purposes
// ----------------------------------------------------------------------------

HomePresence.prototype.printMotionStatus = function (){
    var self = this;

    if(this.config.debug_logging){
        self.config.motion_sensors.forEach(function(dev) {
            var motionSensor = self.controller.devices.get(dev.motion_sensor);

            if (motionSensor.get('metrics:level') === 'on') {
                console.log(motionSensor.deviceId + ' is ON');
            } else {
                console.log(motionSensor.deviceId + ' is OFF');
            }
        });
    }
};

HomePresence.prototype.debug_log = function (msg){
    if(this.config.debug_logging){
        console.log('[HomePresence] ' + msg);
    }
};

HomePresence.prototype.info_log = function (msg){
    console.log('[HomePresence] ' + msg);
};
