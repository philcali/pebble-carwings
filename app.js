var Settings = require('settings')
  , Flow = require('flow')
  , Wakeup = require('wakeup')
  , flow = new Flow(Settings.option());

Settings.config(
  'http://pebble-carwings.s3-website-us-east-1.amazonaws.com/',
  function(e) {
    // Init certain options
    if (!e.options || (e.options && !e.options.range)) {
      Settings.option('range', 'mi');
    }
  },
  function(e) {
    // Always clear the session
    var sessionId = Settings.option('sessionId');
    if (sessionId) {
      Settings.option('sessionId', null);
    }
  });

// (wat)?
Wakeup.launch(flow.launch.bind(flow));
