var clc = require('cli-color');
var _ = require('lodash');

function PrerenderLogger(config, prefix) {
  this.config = config;
  this.prefix = prefix;

  this.levels = {
    debug: 0,
    renderer: 1,
    server: 2,
    error: 3
  };

  this.formats = {
    debug: function(val) {
      return clc.blackBright(val);
    },
    renderer: function(val) {
      return clc.blueBright(val);
    },
    server: function(val) {
      return clc.cyan(val);
    },
    error: function(val) {
      return clc.red(val);
    }
  };
};

/*
 * Utility class for prerender logging
 */
PrerenderLogger.prototype.log = function(level) {
  var _this = this;

  if (this.levels[this.config.level] > this.levels[level]) {
    return;
  }

  var args = [].slice.call(arguments);
  args.shift();

  args.unshift('[' + this.prefix + ']');

  if (this.config.timestamp) {
    var timestamp = new Date().toISOString();
    if (this.config.format) {
      timestamp = clc.inverse(timestamp);
    }
    args.unshift(timestamp);
  }

  if (this.config.format) {
    args = _.map(args, function(arg) {
      if (typeof arg !== 'string') {
        try {
          arg = JSON.stringify(arg);
        } catch (e) {
        }
      }
      return _this.formats[level](arg);
    });
  }

  console.log.apply(this, args);
};

module.exports = PrerenderLogger;
