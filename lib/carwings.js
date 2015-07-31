var ajax = require('ajax')
  , Emitter = require('emitter')
  , util2 = require('util2');

(function() {
  var BASE_URL = 'https://proxywings.com/owners'
    , CODES = {
        INVALID_ARGS: 1001
      }
    , EVENTS = [
        'error',
        'login',
        'authenticated',
        'requestUpdate',
        'vehicleStatus',
        'startClimateControl',
        'stopClimateControl'
      ]
    , HEADERS = {
        'Accept': 'application/json'
      }
    , REQUEST_EVENTS = [
        'success',
        'error',
        'complete'
      ];

  function DeferredRequest(name, carwings, options) {
    this.name = name;
    this.carwings = carwings;
    this.options = options;
    this.completed = false;
    this.observed = [];
    this.execute();
  }
  util2.copy(Emitter.prototype, DeferredRequest.prototype);
  DeferredRequest.prototype.execute = function() {
    ajax(this.options,
      this._complete('success'),
      this._complete('error'));
  };
  DeferredRequest.prototype._complete = function(name) {
    return (function(data, code, request) {
      var wingEvent = name == 'success' ? this.name : 'error'
        , e = {
            data: data,
            request: request,
            code: code
          };
      this.completed = true;
      this.observed.push(data);
      this.observed.push(code);
      this.observed.push(request);
      this.emit('complete', e);
      this.emit(name, e);
      if (wingEvent != name) {
        this.carwings.emit(wingEvent, e);
      }
    }).bind(this);
  };
  REQUEST_EVENTS.forEach(function(name) {
    DeferredRequest.prototype[name] = function(callback) {
      if (this.completed) {
        callback(
          this.observed[0],
          this.observed[1],
          this.observed[2]);
      } else {
        this.on(name, function(e) {
          callback(e.data, e.code, e.request);
        })
      }
      return this;
    };
  });

  function _ajax() {
    var wings = this
      , args = Array.prototype.slice.call(arguments);
    if (args.length < 2) {
      wings.emit('error', {
        error: new Error('Invalid arguments passed: got ' + args.length + ', expected 2'),
        code: CODES.INVALID_ARGS
      });
    } else {
      var name = args[1]
        , headers = {}
        , templateArgs = args.slice(1);
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

  function login(username, password) {
    return _ajax.apply(this, [
      'login',
      {
        username: username,
        password: password
      }
    ]);
  }

  function requestUpdate(vin) {
    return _ajax.apply(this, [
      'requestUpdate',
      { vin: vin }
    ]);
  }

  function vehicleStatus(vin) {
    return _ajax.apply(this, [
      'vehicleStatus',
      { vin: vin }
    ]);
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
    return this;
  };

  util2.copy(Emitter.prototype, Carwings.prototype);
  Carwings.prototype.login = login;
  Carwings.prototype.requestUpdate = requestUpdate;
  Carwings.prototype.vehicleStatus = vehicleStatus;
  Carwings.prototype.isAuthenticated = function() {
    return typeof this.sessionId !== 'undefined';
  };

  if (typeof module !== 'undefined') {
    module.exports = Carwings;
  } else {
    window.Carwings = Carwings;
  }
  return Carwings;
})();
