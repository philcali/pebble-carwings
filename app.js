var Carwings = require('carwings')
  , settings = require('settings')
  , config = settings.option()
  , Vibe = require('ui/vibe')
  , Light = require('ui/light')
  , UI = require('ui')
  , Vector2 = require('vector2')
  , splashCard = new UI.Card({
      title: 'Carwings'
    });

settings.config({
  url: 'http://philcali.servehttp.com:8080/index.html'
});

if (!config.username && !config.password) {
  splashCard.subtitle('Please configure.');
  splashCard.show();
} else {
  var carwings = new Carwings(config)
    , battery = new UI.Window()
    , displayBattery = function(vehicle) {
        var ratio = Math.ceil(vehicle.battery.capacity / vehicle.battery.remaining) * 100;
        var color;
        if (ratio >= 75) {
          color = 'green';
        } else if (ratio >= 50) {
          color = 'yellow';
        } else if (ratio >= 25) {
          color = 'orange';
        } else {
          color = 'red';
        }
        for (var i = 0; i < vehicle.battery.capacity; i++) {
          var bar = new UI.Rect({
            position: new Vector2(9, 132 - (9 * i)),
            size: new Vector2(9 * (i + 1), 9),
            borderColor: 'black',
            backgroundColor: vehicle.battery.remaining > i ? color : 'white'
          });
          battery.add(bar);
        }
        // TODO: this needs to be configurable
        var miles = Math.floor(parseInt(vehicle.battery.range.acOff) * 0.00062137);
        var range = new UI.Text({
          text: miles + ' mi',
          color: 'white',
          font: 'gothic-18-bold',
          position: new Vector2(48, 9),
          size: new Vector2(144, 12)
        });
        battery.add(range);
        battery.show();
      }
    , requestComplete = function() {
        splashCard.hide();
        Vibe.vibrate('short');
        Light.trigger();
      }
    , errorHandler = function(error) {
        var errorCard = new UI.Card({
          title: 'Error',
          subtitle: error.message
        });
        errorCard.show();
      };

  // Store the sessionId for next time
  carwings.on('authenticated', function(e) {
    settings.option('sessionId', e.sessionId);
  });

  carwings.on('error', function(e) {
    console.log(e.code + ': ' + e.message);
    if (typeof e.request !== 'undefined') {
      console.log(e.request.getAllResponseHeaders());
    }
  });

  if (carwings.isAuthenticated()) {
    splashCard.subtitle('Getting Status...');
    splashCard.show();

    carwings
      .vehicleStatus(config.vehicle.vin)
      .complete(requestComplete)
      .error(errorHandler)
      .success(function(data) {
        config.vehicle.battery = data.battery;
        config.vehicle.lastCheck = new Date();
        settings.option('vehicle', config.vehicle);
        displayBattery(config.vehicle);
      });
  } else {
    splashCard.subtitle('Logging In...');
    splashCard.show();

    carwings
      .login(config.username, config.password)
      .complete(requestComplete)
      .error(errorHandler)
      .success(function(vehicle) {
        vehicle.lastCheck = new Date();
        settings.option('vehicle', vehicle);
        displayBattery(vehicle);
      });
  }
}
