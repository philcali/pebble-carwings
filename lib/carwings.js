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
            '<ns2:VIN>' + vin + '</ns2:VIN>'
            '</ns3:VehicleServiceRequestHeader>',
            '</ns3:BatteryStatusCheckRequest>',
            '</ns4:SmartphoneRemoteBatteryStatusCheckRequest>'
          ].join("\n");
        },
        vehicleStatus: function(vin) {
          return [
            '<?xml version="1.0"?>',
            '<ns2:SmartphoneGetVehicleInfoRequest ' + [
              'xmlns:ns2="urn:com:airbiquity:smartphone.userservices:v1",
            ].join(' ') + '>',
            '<VehicleInfo>',
            '<VIN>' + vin + '</VIN>'
            '</VehicleInfo>',
            '<SmartphoneOperationType>SmartphoneLatestBatteryStatusRequest</SmartphoneOperationType>',
            '<changeVehicle>false</changeVehicle>',
            '</ns2:SmartphoneGetVehicleInfoRequest>'
          ].join("\n");
        }
      }
    , CODES = {
        INVALID_ARGS: 1000,
        INVALID_XML: 1100
      }
    , EVENTS = [
        'error',
        'login',
        'authenticated',
        'requestUpdate',
        'vehicleStatus',
        'startClimateControl',
        'stopClimateControl'
      ];

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
        , headers = {};
        , templateArgs = args.slice(2);
      if (wings.isAuthenticated()) {
        headers['Set-Cookie'] = wings.options.sessionId;
      }
      util2.copy(HEADERS, headers);
      ajax(
        {
          url: ENDPOINTS[wings.options.region] + service,
          method: 'POST',
          type: 'xml',
          headers: headers,
          data: TEMPLATES[name].apply(wings, templateArgs)
        },
        function(data, code, request) {
          wings.parser.parse(data, function(response) {
            wings.emit(name, {
              data: response,
              code: code,
              request: request
            });
          });
        },
        function(data, code, request) {
          wings.parser.parse(data, function(response) {
            wings.emit('error', {
              error: response,
              code: code,
              request: request
            });
          });
        }
      );
    }
  };

  var login = function(username, password) {
    _ajax.apply(this, [
      'userService',
      'login',
      username,
      password
    ]);
  };

  var requestUpdate = function(vin) {
    _ajax.apply(this, [
      'vehicleService',
      'requestUpdate',
      vin
    ]);
  };

  var vehicleStatus = function(vin) {
    _ajax.apply(this, [
      'userService',
      'vehicleStatus',
      vin
    ]);
  };

  var Carwings = function(options) {
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
    this.on('login', (function(e) {
      var sessionId = e.request.getResponseHeader('set-cookie');
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
    return this.options.sessionId !== 'undefined';
  };

  if (typeof module !== 'undefined') {
    module.exports = Carwings;
  } else {
    window.Carwings = Carwings;
  }
  return Carwings;
})();