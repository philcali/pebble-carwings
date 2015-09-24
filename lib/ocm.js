var DeferredRequest = require('request')
  , Emitter = require('emitter')
  , util2 = require('util2');

(function() {
  var BASE_URL = 'http://api.openchargemap.io/v2/poi/';

  function OpenChargeMap(options) {
    this.defaults = {
      distance: options.distance || 10,
      output: 'json',
      maxresults: options.maxresults || 10,
      verbose: false,
      camelcase: true,
      distanceunit: options.range == 'mi' ? 'Miles': 'KM'
    };
  }
  util2.copy(Emitter.prototype, OpenChargeMap.prototype);
  OpenChargeMap.prototype.execute = function(overrides) {
    if (!overrides) {
      overrides = {};
    }
    util2.copy(this.defaults, overrides);
    var params = [];
    for (var key in overrides) {
      params.push(encodeURIComponent(key) + '=' + encodeURIComponent(overrides[key]));
    }
    return new DeferredRequest('poi', this, {
      url: BASE_URL + '?' + params.join('&'),
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
  };

  if (typeof module !== 'undefined') {
    module.exports = OpenChargeMap;
  } else {
    window.OpenChargeMap = OpenChargeMap;
  }
  return OpenChargeMap;
})();
