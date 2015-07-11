var UI = require('ui')
  , util2 = require('util2')
  , Vector2 = require('vector2');

(function() {
  var CONVERSIONS = {
    mi: function(range) {
      return Math.floor(range * 0.00062137);
    },
    km: function(range) {
      return Math.floor(range / 1000);
    }
  };

  function BatteryDisplay(options) {
    UI.Window.call(this, {
      fullscreen: false,
    });
    this.options = options;
    this.capacity = [];
    this.nickname = new UI.Text({
      color: 'white',
      font: 'gothic-18-bold',
      textAlign: 'center',
      position: new Vector2(0, 3),
      size: new Vector2(144, 12)
    });
    this.rangeOn = new UI.Text({
      color: 'white',
      font: 'gothic-18-bold',
      textAlign: 'left',
      position: new Vector2(9, 101),
      size: new Vector2(144, 12)
    });
    this.rangeOff = new UI.Text({
      color: 'white',
      font: 'gothic-18-bold',
      textAlign: 'left',
      position: new Vector2(9, 116),
      size: new Vector2(144, 12)
    });
    this.add(this.nickname);
    this.add(this.rangeOn);
    this.add(this.rangeOff);
  }
  util2.inherit(BatteryDisplay, UI.Window)

  BatteryDisplay.prototype.rangeText = function(dir, battery) {
    return dir + ': ' + CONVERSIONS[this.options.range](battery.range['ac' + dir]) + ' ' + this.options.range;
  };
  BatteryDisplay.prototype.batteryColor = function(battery) {
    if (battery.pluginState == 'CONNECTED') {
      return 'blue';
    }
    var ratio = Math.ceil((battery.remaining / battery.capacity) * 100);
    if (ratio >= 75) {
      return 'green';
    } else if (ratio >= 50) {
      return 'yellow';
    } else if (ratio >= 25) {
      return 'orange';
    } else {
      return 'red';
    }
  };
  BatteryDisplay.prototype.fillCapacity = function(battery) {
    var color = this.batteryColor(battery);
    while (this.capacity.length > 0) {
      this.remove(this.capacity.pop());
    }
    for (var i = 0; i < battery.capacity; i++) {
      var width = 9 * (i + 1)
        , bar = new UI.Rect({
            position: new Vector2(124 - width, 126 - (9 * i)),
            size: new Vector2(width, 9),
            borderColor: 'black',
            backgroundColor: battery.remaining > i ?
              color : 'white'
          });
      this.capacity.push(bar);
      this.add(bar);
    }
  };
  BatteryDisplay.prototype.update = function(vehicle) {
    this.nickname.text(vehicle.nickname);
    this.rangeOn.text(this.rangeText('On', vehicle.battery));
    this.rangeOff.text(this.rangeText('Off', vehicle.battery));
    this.fillCapacity(vehicle.battery);
    return this;
  };

  if (typeof module !== 'undefined') {
    module.exports = BatteryDisplay;
  } else {
    window.BatteryDisplay = BatteryDisplay;
  }
  return BatteryDisplay;
})();