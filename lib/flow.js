var Carwings = require('carwings')
  , Settings = require('settings')
  , BatteryDisplay = require('display')
  , Vibe = require('ui/vibe')
  , Light = require('ui/light')
  , Wakeup = require('wakeup')
  , UI = require('ui')
  , Safe = require('safe.js');

(function() {
  var updateCard = new UI.Card({
        title: 'Carwings',
        subtitle: 'Update Success!',
        body: 'You will be notified in 5 minutes.'
      })
    , splashCard = new UI.Card({
        title: 'Carwings'
      });

  function Flow(config, data) {
    this.config = config;
    this.data = data;
    if (data.owner) {
      data.owner.vehicle.battery.lastCheck = new Date(data.owner.vehicle.battery.lastCheck);
    }
    this.carwings = new Carwings(config, data.sessionId);
    this.display = new BatteryDisplay(config);
    // Add all event listeners
    this.carwings.on('error', Safe.dumpError);
    this.carwings.on('authenticated', this.storeSession);
    this.carwings.on('delete', this.removeSession);
    this.display.on('click', 'select', this.clickUpdate.bind(this));
  };
  // Entry point of app
  Flow.prototype.launch = function(e) {
    if (!this.isConfigured()) {
      splashCard.subtitle('Please Configure.');
      splashCard.show();
    } else if (this.carwings.isAuthenticated()) {
      if (e && e.wakeup) {
        this.vehicleStatus();
      } else {
        this.display.update(this.data.owner).show();
      }
    } else {
      this.login();
    }
  };
  // Visual API calls
  Flow.prototype.login = function() {
    splashCard.subtitle('Logging In...');
    splashCard.show();
    this.carwings
      .login(this.config.username, this.config.password)
      .complete(this.requestComplete)
      .error(this.errorHandler)
      .success(this.updateVehicle.bind(this));
  };
  Flow.prototype.vehicleStatus = function() {
    splashCard.subtitle('Getting Status...');
    splashCard.show();
    this.carwings
      .vehicleStatus(this.data.vehicle.vin)
      .complete(this.requestComplete)
      .error(this.errorHandler)
      .success(this.updateVehicle.bind(this));
  };
  Flow.prototype.requestUpdate = function() {
    splashCard.subtitle('Requesting Update...');
    splashCard.show();
    this.carwings
      .requestUpdate(this.data.vehicle.vin)
      .complete(this.requestComplete)
      .error(this.errorHandler)
      .success(this.updateComplete.bind(this));
  };
  Flow.prototype.storeSession = function(e) {
    Settings.data('sessionId', e.sessionId);
  };
  Flow.prototype.removeSession = function(e) {
    Settings.data('sessionId', null);
  };
  // End Visual API calls
  Flow.prototype.isConfigured = function() {
    return this.config.username && this.config.password;
  };
  Flow.prototype.updateVehicle = function(owner) {
    Settings.data('owner', owner);
    this.data.owner = owner;
    this.display.update(this.data.owner).show();
  };
  Flow.prototype.updateComplete = function() {
    var lastCheck = Date.now();
    Wakeup.schedule({
      time: lastCheck / 1000 + (60 * 5),
      data: { lastCheck: lastCheck }
    },
    (function(e) {
      if (e.failed) {
        var error = { code: e.error }
        switch (e.error) {
        case 'range':
          error.message = 'Another update is scheduled.';
          break;
        case 'outOfResources':
          error.message = 'App has exceed request limit.';
          break;
        default:
          error.message = 'Unknown internal error occurred.';
        }
        this.errorHandler(error);
      } else {
        updateCard.show();
      }
    }).bind(this));
  };
  // TODO: get remote climate control working
  Flow.prototype.toggleAc = function(direction) {
    return (function() {
      if (this.config.acToggle != 'ac' + direction) {
        this.config.acToggle = 'ac' + direction;
        this.display.update(this.data.owner);
        Vibe.vibrate('short');
      }
    }).bind(this);
  };
  Flow.prototype.clickUpdate = function() {
    var now = Date.now()
      , check = this.data.owner.vehicle.battery.lastCheck.getTime();
    // If the last request status was 5 minutes ago...
    if (now - check > (5 * 1000 * 60)) {
      this.requestUpdate();
    } else {
      this.vehicleStatus();
    }
  };
  Flow.prototype.requestComplete = function() {
    splashCard.hide();
    Vibe.vibrate('short');
    Light.trigger();
  };
  Flow.prototype.errorHandler = function(error) {
    var errorCard = new UI.Card({
      title: 'Error',
      subtitle: error.code,
      body: error.message
    });
    errorCard.show();
  };

  if (typeof module !== 'undefined') {
    module.exports = Flow;
  } else {
    window.Flow = Flow;
  }
  return Flow;
})();
