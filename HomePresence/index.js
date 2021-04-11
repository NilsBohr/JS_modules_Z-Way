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
    this.default_advanced_config = {interval: 1,
                                    netcat_port: 80,
                                    hysteresis: false,
                                    hysteresis_size: 3,
                                    debug_logging: false};
    this.crontask_name = undefined;
    this.langfile = this.controller.loadModuleLang("HomePresence");
}

inherits(HomePresence, AutomationModule);

_module = HomePresence;


// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

HomePresence.prototype.init = function (config){
    config.advanced_config = _.extend({}, this.default_advanced_config, config.advanced_config); // добавляет значения по умолчанию в конфиг

    HomePresence.super_.prototype.init.call(this, config);

    var self = this;
    this.debug_log = _.bind(this.debug_log, self);

    // creating virtual device
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

    // polling function
    this.poll_addr = function () {
        try {
            self.alive = false;
            self.addrs.forEach(function (addr, index) {
                var p = self.config.advanced_config.netcat_port;
                var response = system('netcat -v -z -w ' + '10' + ' ' + addr + ' ' + p + ' 2>&1');

                self.alive = self.alive || (response[1].indexOf("No route to host") == -1 && (response[1].indexOf("Operation now in progress") == -1));
                (response[1].indexOf("No route to host") == -1 && (response[1].indexOf("Operation now in progress") == -1)) ? self.debug_log(addr + " is present") : self.debug_log(addr + " is absent");
                self.debug_log(addr + " command output:\n" + response[1]);
                    
                if (self.alive) {
                    if (self.vDevPresence.get("metrics:level") === "off") {
                        self.vDevPresence.set("metrics:level", "on");
                    }
                }
                    
                if (!self.alive && (index === (self.addrs.length - 1))) {
                    if (self.vDevPresence.get("metrics:level") === "on") {
                        self.vDevPresence.set("metrics:level", "off");
                    }
                    self.debug_log("Presence is not detected!");
                } else if (self.alive && (index === (self.addrs.length - 1))) {
                    self.debug_log("Presence detected!");
                }
            });
        }
        catch(err){
            var msg = "Home Presence: No permissions to run netcat. Add command 'netcat'; to .syscommands file.";
            self.controller.addNotification(
                "error",
                msg,
                "module",
                "HomePresence"
            );
            self.debug_log("Polling failed, check syscommands");
            return;
        }
    };

    // adding addresses
    this.config.network_addresses.forEach(function(item) {
        self.addrs.push(item.addr);
    });

    // adding cron job
    var crontime = {minute: [0, 59, config.advanced_config.interval],
        hour: null,
        weekDay: null,
        day: null,
        month: null};

    this.crontask_name = 'HomePresence_' + self.id + '.poll';
    this.controller.emit('cron.addTask', this.crontask_name, crontime);
    this.controller.on(this.crontask_name, this.poll_addr);

    if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
    }

    // initial polling
    this.poll_addr();
};


// ----------------------------------------------------------------------------
// --- Module instance stopped
// ----------------------------------------------------------------------------

HomePresence.prototype.stop = function (){
    HomePresence.super_.prototype.stop.call(this);

    if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
    }

    this.controller.devices.remove(this.vDevPresence);
    this.addrs = [];
    this.controller.emit('cron.removeTask', this.crontask_name);
    this.controller.off(this.crontask_name, this.poll_addr);
};

// ----------------------------------------------------------------------------
// --- Logging for debugging purposes
// ----------------------------------------------------------------------------

HomePresence.prototype.debug_log = function (msg){
    if(this.config.advanced_config.debug_logging){
        console.log("[HomePresence] " + msg);
    }
};
