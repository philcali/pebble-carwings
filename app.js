var Settings = require('settings')
  , Flow = require('flow')
  , Wakeup = require('wakeup')
  , wipe = function(func) {
      var options = Settings[func]();
      for (var key in options) {
        Settings[func](key, null);
      }
      return options;
    }
  , flow = new Flow(Settings.option(), Settings.data());

Settings.config(
  'https://proxywings.com/',
  function(e) {
    // Init certain options
    if (!e.options || (e.options && !e.options.range)) {
      Settings.option('range', 'mi');
      Settings.option('region', 'us');
    }
  },
  function(e) {
    // Always clear the vehicle info
    if (e.options !== 'CANCELLED') {
      var sessionId = Settings.data('sessionId');
      if (sessionId) {
        flow.carwings.remove();
      }
    }
  });

// (wat)?
Wakeup.launch(flow.launch.bind(flow));
