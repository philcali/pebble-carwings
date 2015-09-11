var UI = require('ui')
  , Emitter = require('emitter')
  , util2 = require('util2');

(function() {
  var EVENTS = [[
      'requestUpdate',
      'startClimateControl',
      'stopClimateControl',
      'information'
    ],[
      'location',
      'about'
    ]];

  function CarwingsMenu() {
    UI.Menu.call(this, {
      sections: [{
        title: 'Vehicle',
        items: [{
          title: ' Update',
          icon: 'images/refresh.png'
        }, {
          title: ' Start AC',
          icon: 'images/moving_fan.png'
        }, {
          title: ' Stop AC',
          icon: 'images/fan.png'
        }, {
          title: ' Info',
          icon: 'images/about.png'
        }]
      }, {
        title: 'General',
        items: [{
          title: ' Stations',
          icon: 'images/location.png'
        }, {
          title: ' About',
          icon: 'images/info.png'
        }]
      }]
    });
    this.on('select', (function(e) {
      this.emit(EVENTS[e.sectionIndex][e.itemIndex], e);
    }).bind(this));
  }
  util2.inherit(CarwingsMenu, UI.Menu);
  util2.copy(Emitter.prototype, CarwingsMenu.prototype);

  CarwingsMenu.prototype.update = function(owner) {
    this.section(0).title = owner.nickname;
    return this;
  };

  if (typeof module !== 'undefined') {
    module.exports = CarwingsMenu;
  } else {
    window.CarwingsMenu = CarwingsMenu;
  }
  return CarwingsMenu;
})();
