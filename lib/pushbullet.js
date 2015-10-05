var DeferredRequest = require('request')
  , Emitter = require('emitter')
  , util2 = require('util2');

(function() {
  var BASE_URL = 'https://proxywings.com/pushbullet/push';

  function Pushbullet(accountId, config) {
    this.accountId = accountId;
    this.devices = config.pushbullet.devices;
  }
  util2.copy(Emitter.prototype, Pushbullet.prototype);
  Pushbullet.prototype.execute = function(push) {
    if (push.title && push.body && push.coords) {
      push.accountId = this.accountId;
      push.devices = this.devices;
      return new DeferredRequest('pushbullet.push', this, {
        url: BASE_URL,
        method: 'POST',
        type: 'json',
        data: push
      });
    } else {
      throw new Error("Pushbullet needs a title, body, coords.");
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = Pushbullet;
  } else {
    window.Pushbullet = Pushbullet;
  }
  return Pushbullet;
})();
