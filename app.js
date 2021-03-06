var Settings = require('settings')
  , Flow = require('flow')
  , Wakeup = require('wakeup')
  , accountId = Pebble.getAccountToken()
  , wipe = function(func) {
      var options = Settings[func]();
      for (var key in options) {
        Settings[func](key, null);
      }
      return options;
    }
  , flow = new Flow(accountId, Settings.option(), Settings.data());

Settings.config(
  'https://proxywings.com/?accountId=' + accountId,
  function(e) {
    // Init certain options
    if (!e.options || (e.options && !e.options.range)) {
      Settings.option('range', 'mi');
      Settings.option('region', 'us');
    }
  },
  function(e) {
    // Always clear the vehicle info
    if (e.originalEvent.data !== 'CANCELLED') {
      var sessionId = Settings.data('sessionId');
      if (sessionId) {
        flow.carwings.remove();
      }
    }
  });

// (wat)?
Wakeup.launch(flow.launch.bind(flow));
