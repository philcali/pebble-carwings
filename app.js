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
      console.log(JSON.stringify(e.error));
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
    });
    carwings.vehicleStatus(config.vehicle.vin);
  } else {
    var carwingsCard = new UI.Card({
      title: 'Carwings',
      subtitle: 'Logging In...'
    });
    carwingsCard.show();

    carwings.on('login', function(e) {
      // TODO: probably parse this info within the lib
      var batteryResponse = e.data['ns2:SmartphoneLoginWithAdditionalOperationResponse']['ns4:SmartphoneLatestBatteryStatusResponse']
        , vehicle = {
            nickname: e.data['ns2:SmartphoneLoginWithAdditionalOperationResponse']['SmartphoneUserInfoType']['Nickname'],
            vin: e.data['ns2:SmartphoneLoginWithAdditionalOperationResponse']['SmartphoneUserInfoType']['VehicleInfo']['Vin'],
            battery: {
              charging: batteryResponse['SmartphoneBatteryStatusResponseType']['ns3:BatteryStatusRecords']['ns3:BatteryStatus']['ns3:BatteryChargingStatus'],
              capacity: batteryResponse['SmartphoneBatteryStatusResponseType']['ns3:BatteryStatusRecords']['ns3:BatteryStatus']['ns3:BatteryCapacity'],
              remaining: batteryResponse['SmartphoneBatteryStatusResponseType']['ns3:BatteryStatusRecords']['ns3:BatteryStatus']['ns3:BatteryRemainingAmount'],
            },
            pluginState: batteryResponse['SmartphoneBatteryStatusResponseType']['ns3:BatteryStatusRecords']['ns3:PluginState'],
            range: {
              acOn: batteryResponse['SmartphoneBatteryStatusResponseType']['ns3:BatteryStatusRecords']['ns3:CruisingRangeAcOn'],
              acOff: batteryResponse['SmartphoneBatteryStatusResponseType']['ns3:BatteryStatusRecords']['ns3:CruisingRangeAcOff'],
            },
            lastCheck: new Date(batteryResponse['SmartphoneBatteryStatusResponseType']['lastBatteryStatusCheckExecutionTime'])
          };
      settings.option('vehicle', vehicle);
      // TODO: show this information in a meaningful way
    });
    carwings.login(config.username, config.password);
  }
}
