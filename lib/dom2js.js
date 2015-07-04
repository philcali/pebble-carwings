var sax = require('sax')
  , Emitter = require('emitter')
  , util2 = require('util2');

(function() {
  var Dom2Js = function(options) {
    this.options = options || {
      strict: true,
      whitespace: /\s+/
    };
  };

  util2.copy(Emitter.prototype, Dom2Js.prototype);
  Dom2Js.prototype.parse = function(xml, callback) {
    var parser = sax.parser(this.options.strict, this.options)
      , object = this
      , resp = {}
      , tagStack = [];

    parser.onerror = function(error) {
      object.emit('error', {
        error: error,
        xml: xml
      });
    };

    parser.onopentag = function(tag) {
      tagStack.push([tag, {}, []]);
    };

    parser.onclosetag = function(tagName) {
      var tuple = tagStack.pop();
      if (tagStack.length > 0) {
        var text = tuple[2].join('');
        tagStack[tagStack.length - 1][1][tagName] = text == '' ? tuple[1] : text;
      } else {
        resp[tagName] = tuple[1];
      }
    };

    parser.ontext = function(text) {
      if (tagStack.length > 0 && !text.match(object.options.whitespace)) {
        tagStack[tagStack.length - 1][2].push(text);
      }
    };

    parser.onend = function() {
      callback(resp, xml);
      object.emit('complete', {
        data: resp,
        xml: xml
      });
    };

    parser.write(xml).end();
  };

  if (typeof module !== 'undefined') {
    module.exports = Dom2Js;
  } else {
    window.Dom2Js = Dom2Js;
  }
  return Dom2Js;
})();
