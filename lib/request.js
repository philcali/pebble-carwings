var ajax = require('ajax')
  , Emitter = require('emitter')
  , util2 = require('util2');

(function() {
  var REQUEST_EVENTS = [
    'success',
    'error',
    'complete'
  ];

  function DeferredRequest(name, service, options) {
    this.name = name;
    this.service = service;
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
      var serviceEvent = name == 'success' ? this.name : 'error'
        , data = code == 204 ? {} : JSON.parse(data)
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
      if (serviceEvent != name) {
        this.service.emit(serviceEvent, e);
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

  if (typeof module !== 'undefined') {
    module.exports = DeferredRequest;
  } else {
    window.DeferredRequest = DeferredRequest;
  }
  return DeferredRequest;
})();
