var DeferredRequest = require('request')
  , Emitter = require('emitter')
  , util2 = require('util2');

(function() {
  var BASE_URL = 'https://proxywings.com/owners'
    , CODES = {
        INVALID_ARGS: 1001
      }
    , EVENTS = [
        'error',
        'get',
        'delete',
        'login',
        'authenticated',
        'requestUpdate',
        'vehicleStatus',
        'startClimateControl',
        'stopClimateControl'
      ]
    , HEADERS = {
        'Accept': 'application/json'
      };

  function _post() {
    var wings = this
      , args = Array.prototype.slice.call(arguments);
    if (args.length < 2) {
      wings.emit('error', {
        error: new Error('Invalid arguments passed: got ' + args.length + ', expected 2'),
        code: CODES.INVALID_ARGS
      });
    } else {
      var name = args[0]
        , headers = {}
        , templateArgs = args.slice(1).pop();
      if (wings.isAuthenticated()) {
        headers['X-Authorized-Identity'] = wings.sessionId;
      }
      util2.copy(HEADERS, headers);
      util2.copy({ region: wings.options.region }, templateArgs);
      return new DeferredRequest(name, wings, {
        url: [BASE_URL, name].join('/'),
        method: 'POST',
        headers: headers,
        data: templateArgs
      });
    }
  }

  function _ajax(type) {
    return function() {
      var headers = {};
      if (this.isAuthenticated()) {
        headers['X-Authorized-Identity'] = this.sessionId;
      }
      util2.copy(HEADERS, headers);
      return new DeferredRequest(type.toLowerCase(), this, {
        url: BASE_URL,
        method: type,
        headers: headers
      });
    };
  }

  function login(username, password) {
    return _post.apply(this, [
      'login',
      {
        username: username,
        password: password
      }
    ]);
  }

  function requestUpdate(vin) {
    return _post.apply(this, [
      'requestUpdate',
      { vin: vin }
    ]);
  }

  function vehicleStatus(vin) {
    return _post.apply(this, [
      'vehicleStatus',
      { vin: vin }
    ]);
  }

  function startClimateControl(date) {
    var params = {};
    if (date) {
      params.startTime = date.toJSON();
    }
    return _post.apply(this, [
      'startClimateControl',
      params
    ]);
  }

  function stopClimateControl() {
    return _post.apply(this, ['stopClimateControl', {}]);
  }

  function Carwings(options, sessionId) {
    this.sessionId = sessionId;
    this.options = options || {};
    if (!this.options.region) {
      this.options.region = 'us';
    }
    this.on('login', (function(e) {
      this.sessionId = e.data.id;
      this.emit('authenticated', {
        sessionId: e.data.id,
        login: e
      });
    }).bind(this));
    this.on('delete', (function(e) {
      delete this.sessionId;
    }).bind(this));
    return this;
  };

  util2.copy(Emitter.prototype, Carwings.prototype);
  Carwings.prototype.get = _ajax('GET');
  Carwings.prototype.remove = _ajax('DELETE');
  Carwings.prototype.login = login;
  Carwings.prototype.requestUpdate = requestUpdate;
  Carwings.prototype.vehicleStatus = vehicleStatus;
  Carwings.prototype.startClimateControl = startClimateControl;
  Carwings.prototype.stopClimateControl = stopClimateControl;
  Carwings.prototype.isAuthenticated = function() {
    return typeof this.sessionId === 'string';
  };

  if (typeof module !== 'undefined') {
    module.exports = Carwings;
  } else {
    window.Carwings = Carwings;
  }
  return Carwings;
})();
