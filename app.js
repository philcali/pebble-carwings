var Carwings = require('carwings')
  , settings = require('settings')
  , config = settings.option()
  , UI = require('ui');

settings.config({
  url: 'http://philcali.servehttp.com:8080/index.html'
});

if (!config.username && !config.password) {
  // Short circuit
  var carwingsCard = new UI.Card({
    title: 'Carwings',
    subtitle: 'Please configure.'
  });

  carwingsCard.show();
} else {
  var carwings = new Carwings(config);

  // Store the sessionId for next time
  carwings.on('authenticated', function(e) {
    settings.option('sessionId', e.sessionId);
  });

  carwings.on('error', function(e) {
    if (e.error instanceof Error) {
      console.log(e.code + ': ' + e.message);
    } else {
      console.log(JSON.stringify(e.code));
      console.log(e.request.getAllResponseHeaders());
    }
  });

  if (carwings.isAuthenticated()) {
    var carwingsCard = new UI.Card({
      title: 'Carwings',
      subtitle: 'Getting Status...'
    });
    carwingsCard.show();

    carwings.on('vehicleStatus', function(e) {
      config.vehicle.battery = e.data;
      settings.option('vehicle', config.vehicle);
    });
    carwings.vehicleStatus(config.vehicle.vin);
  } else {
    var carwingsCard = new UI.Card({
      title: 'Carwings',
      subtitle: 'Logging In...'
    });
    carwingsCard.show();

    carwings.on('login', function(e) {
      settings.option('vehicle', e.data);
    });
    carwings.login(config.username, config.password);
  }
}
