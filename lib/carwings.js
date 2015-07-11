var ajax = require('ajax')
  , Emitter = require('emitter')
  , util2 = require('util2')
  , Dom2Js = require('dom2js');

(function() {
  var ENDPOINTS = {
        us: 'https://nissan-na-smartphone-biz.viaaq.com/aqPortal/smartphoneProxy/',
        eu: 'https://nissan-eu-smartphone-biz.viaaq.eu/aqPortal/smartphoneProxy/'
      }
    , HEADERS = {
        'User-Agent': 'NissanLEAF/1.40 CFNetwork/485.13.9 Darwin/11.0.0 pebble-carwings',
        "Content-Type": 'text/xml'
      }
    , TEMPLATES = {
        login: function(username, password) {
          return [
            '<?xml version="1.0"?>',
            '<ns2:SmartphoneLoginWithAdditionalOperationRequest ' + [
              'xmlns:ns4="urn:com:hitachi:gdc:type:report:v1"',
              'xmlns:ns7="urn:com:airbiquity:smartphone.vehicleservice:v1"',
              'xmlns:ns3="http://www.nissanusa.com/owners/schemas/api/0"',
              'xmlns:ns5="urn:com:airbiquity:smartphone.reportservice:v1"',
              'xmlns:ns2="urn:com:airbiquity:smartphone.userservices:v1"',
              'xmlns:ns6="urn:com:hitachi:gdc:type:vehicle:v1"'
            ].join(' ') + '>',
            '<SmartphoneLoginInfo>',
            '<UserLoginInfo>',
            '<userId>' + username + '</userId>',
            '<userPassword>' + password + '</userPassword>',
            '</UserLoginInfo>',
            '<DeviceToken>PEBBLE' + (new Date().getTime()) + '</DeviceToken>',
            '<UUID>pebble-carwings:' + username + '</UUID>',
            '<Locale>US</Locale>',
            '<AppVersion>1.7</AppVersion>',
            '<SmartphoneType>IPHONE</SmartphoneType>',
            '</SmartphoneLoginInfo>',
            '<SmartphoneOperationType>SmartphoneLatestBatteryStatusRequest</SmartphoneOperationType>',
            '</ns2:SmartphoneLoginWithAdditionalOperationRequest>'
          ].join("\n");
        },
        requestUpdate: function(vin) {
          return [
            '<?xml version="1.0"?>',
            '<ns4:SmartphoneRemoteBatteryStatusCheckRequest ' + [
              'xmlns:ns2="urn:com:hitachi:gdc:type:portalcommon:v1"',
              'xmlns:ns4="urn:com:airbiquity:smartphone.vehicleservice:v1"',
              'xmlns:ns3="urn:com:hitachi:gdc:type:vehicle:v1"'
            ].join(' ') + '>',
            '<ns3:BatteryStatusCheckRequest>',
            '<ns3:VehicleServiceRequestHeader>',
            '<ns2:VIN>' + vin + '</ns2:VIN>',
            '</ns3:VehicleServiceRequestHeader>',
            '</ns3:BatteryStatusCheckRequest>',
            '</ns4:SmartphoneRemoteBatteryStatusCheckRequest>'
          ].join("\n");
        },
        vehicleStatus: function(vin) {
          return [
            '<?xml version="1.0"?>',
            '<ns2:SmartphoneGetVehicleInfoRequest ' + [
              'xmlns:ns2="urn:com:airbiquity:smartphone.userservices:v1"',
            ].join(' ') + '>',
            '<VehicleInfo>',
            '<VIN>' + vin + '</VIN>',
            '</VehicleInfo>',
            '<SmartphoneOperationType>SmartphoneLatestBatteryStatusRequest</SmartphoneOperationType>',
            '<changeVehicle>false</changeVehicle>',
            '</ns2:SmartphoneGetVehicleInfoRequest>'
          ].join("\n");
        }
      }
    , PARSERS = {
        battery: function(response) {
          return {
            charging: response['SmartphoneBatteryStatusResponseType']['ns3:BatteryStatusRecords']['ns3:BatteryStatus']['ns3:BatteryChargingStatus'],
            capacity: parseInt(response['SmartphoneBatteryStatusResponseType']['ns3:BatteryStatusRecords']['ns3:BatteryStatus']['ns3:BatteryCapacity']),
            remaining: parseInt(response['SmartphoneBatteryStatusResponseType']['ns3:BatteryStatusRecords']['ns3:BatteryStatus']['ns3:BatteryRemainingAmount']),
            pluginState: response['SmartphoneBatteryStatusResponseType']['ns3:BatteryStatusRecords']['ns3:PluginState'],
            range: {
              acOn: parseInt(response['SmartphoneBatteryStatusResponseType']['ns3:BatteryStatusRecords']['ns3:CruisingRangeAcOn']),
              acOff: parseInt(response['SmartphoneBatteryStatusResponseType']['ns3:BatteryStatusRecords']['ns3:CruisingRangeAcOff'])
            },
            lastCheck: new Date(response['SmartphoneBatteryStatusResponseType']['lastBatteryStatusCheckExecutionTime'])
          };
        },
        login: function(response) {
          var battery = this.battery;
          return {
            nickname: response['ns2:SmartphoneLoginWithAdditionalOperationResponse']['SmartphoneUserInfoType']['Nickname'],
            vin: response['ns2:SmartphoneLoginWithAdditionalOperationResponse']['SmartphoneUserInfoType']['VehicleInfo']['Vin'],
            battery: battery(response['ns2:SmartphoneLoginWithAdditionalOperationResponse']['ns4:SmartphoneLatestBatteryStatusResponse'])
          };
        },
        vehicleStatus: function(response) {
          var battery = this.battery;
          return {
            battery: battery(response['ns2:SmartphoneLatestBatteryStatusRequest']['ns4:SmartphoneLatestBatteryStatusResponse'])
          };
        },
        error: function(response) {
          var code = response['ns7:SmartphoneErrorType']['ErrorType'];
          var message;
          switch (code) {
          case CODES.INVALID_CREDS:
            message = 'Error authenticating. Check your credentials.';
            break;
          case CODES.INVALID_SESSION:
            message = 'Invalid session. Retry login.';
            break;
          default:
            message = 'Unknown carwings service error.';
          }
          return {
            code: code,
            message: message
          };
        }
      }
    , CODES = {
        INVALID_ARGS: 1000,
        INVALID_XML: 1100,
        INVALID_CREDS: 9001,
        INVALID_SESSION: 9003
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
    , REQUEST_EVENTS = [
        'success',
        'error',
        'complete'
      ];

  function SoapRequest(name, carwings, options) {
    this.name = name;
    this.carwings = carwings;
    this.options = options;
    this.completed = false;
    this.observed = [];
    this.execute();
  }
  util2.copy(Emitter.prototype, SoapRequest.prototype);
  SoapRequest.prototype.execute = function() {
    ajax(this.options,
      this._complete('success'),
      this._complete('error'));
  };
  SoapRequest.prototype._complete = function(name) {
    return (function(data, code, request) {
      this.carwings.parser.parse(data, (function(response) {
        var wingEvent = name == 'success' ? this.name : 'error'
          , e = {
              data: PARSERS[wingEvent](response),
              request: request,
              code: code
            };
        if (e.data.code && e.data.code == CODES.INVALID_SESSION) {
          var user = this.carwings.options.username
            , pass = this.carwings.options.password;
          // Attempt to login or bubble error
          this.carwings
            .login(user, pass)
            .success(this.execute)
            .error(this._complete('error'));
        } else {
          this.completed = true;
          this.observed.push(response);
          this.observed.push(code);
          this.observed.push(request);
          this.emit('complete', e);
          this.emit(name, e);
          this.carwings.emit(wingEvent, e);
        }
      }).bind(this));
    }).bind(this);
  };
  REQUEST_EVENTS.forEach(function(name) {
    SoapRequest.prototype[name] = function(callback) {
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
      var service = args[0]
        , name = args[1]
        , headers = {}
        , templateArgs = args.slice(2);
      if (wings.isAuthenticated()) {
        headers['Cookie'] = wings.options.sessionId;
      }
      util2.copy(HEADERS, headers);
      return new SoapRequest(name, wings, {
        url: ENDPOINTS[wings.options.region] + service,
        method: 'POST',
        type: 'xml',
        headers: headers,
        data: TEMPLATES[name].apply(wings, templateArgs)
      });
    }
  }

  function login(username, password) {
    return _ajax.apply(this, [
      'userService',
      'login',
      username,
      password
    ]);
  }

  function requestUpdate(vin) {
    return _ajax.apply(this, [
      'vehicleService',
      'requestUpdate',
      vin
    ]);
  }

  function vehicleStatus(vin) {
    return _ajax.apply(this, [
      'userService',
      'vehicleStatus',
      vin
    ]);
  }

  function Carwings(options) {
    this.options = options || {};
    if (!this.options.region) {
      this.options.region = 'us';
    }
    this.parser = new Dom2Js(this.options.parseOpts);
    // Pipe XML parsing errors to event listeners
    this.parser.on('error', (function(e) {
      this.emit('error', {
        error: e.error,
        xml: e.xml,
        code: CODES.INVALID_XML
      });
    }).bind(this));
    this._parseCookies = function(sessionId) {
      var cookies = sessionId.split(/\s*,\s*/);
      for (var i = 0; i < cookies.length; i++) {
        cookies[i] = cookies[i].replace(/;.*/, '');
      }
      return cookies.join('; ');
    };
    this.on('login', (function(e) {
      var sessionId = this._parseCookies(e.request.getResponseHeader('set-cookie'));
      this.options.sessionId = sessionId;
      this.emit('authenticated', {
        sessionId: sessionId
      });
    }).bind(this));
    return this;
  };

  util2.copy(Emitter.prototype, Carwings.prototype);
  Carwings.prototype.login = login;
  Carwings.prototype.requestUpdate = requestUpdate;
  Carwings.prototype.vehicleStatus = vehicleStatus;
  Carwings.prototype.isAuthenticated = function() {
    return typeof this.options.sessionId !== 'undefined';
  };

  if (typeof module !== 'undefined') {
    module.exports = Carwings;
  } else {
    window.Carwings = Carwings;
  }
  return Carwings;
})();
