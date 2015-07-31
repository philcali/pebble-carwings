var Settings = require('settings')
  , Flow = require('flow')
  , Wakeup = require('wakeup')
  , flow = new Flow(Settings.option(), Settings.data(), [
      Pebble.getAccountToken(),
      Pebble.getWatchToken()
    ].join('.'));

Settings.config(
  'https://proxywings.com/form/index.html',
  function(e) {
    // Init certain options
    if (!e.options || (e.options && !e.options.range)) {
      Settings.option('range', 'mi');
    }
  },
  function(e) {
    // Always clear the vehicle info
    var sessionId = Settings.data('sessionId');
    if (sessionId) {
      Settings.data('sessionId', null);
    }
  });

// (wat)?
Wakeup.launch(flow.launch.bind(flow));
