var PrerenderLogger = require('./logger');
var _ = require('lodash');

function PrerenderRenderer(config) {
  this.config = config;
  this.logger = new PrerenderLogger(this.config.logging, 'Renderer ' + this.config.processNum);
  this.plugins = this.loadPlugins();
  this.engine = this.loadEngine();

  process.on('SIGUSR2', _.bind(function() {
    this.logger.log('renderer', "Received SIGUSR2 signal, restarting rendering engine");
    this.restartEngine();
  }, this));
}

/*
 * Initialize the renderer and associated rendering engine (JSDOM, PhantomJS, WebDriverJs)
 */
PrerenderRenderer.prototype.startEngine = function() {
  var _this = this;

  this.logger.log('renderer', "Engine starting up (" + this.config.engine + ")");
  this.numRequests = 0;
  this.startTime = process.hrtime();
  this.initializeTimer = setTimeout(_.bind(this.onInitializeTimeout, this), this.config.initializeTimeout);
  this.busy = true;

  _this.engine.init(
    this.config.appUrl,
    _.bind(_this.afterEngineInit, _this),
    _.bind(_this.onEngineError, _this),
    _.bind(_this.beforeEngineInit, _this)
  );
};

/*
 * Shutdown the rendering engine
 */
PrerenderRenderer.prototype.stopEngine = function() {
  this.logger.log('renderer', "Engine shutting down");

  clearTimeout(this.initializeTimer);
  clearTimeout(this.renderTimer);
  this.initializeTimer = null;
  this.renderTimer = null;

  if (this.job) {
    this.logger.log('error', "Engine stopped before rendering: " + this.job.page.url);
    this.terminateActiveJob();
  }
  this.engine.shutdown();
};

/*
 * Restart the rendering engine
 */
PrerenderRenderer.prototype.restartEngine = function() {
  this.stopEngine();
  this.startEngine();
};

PrerenderRenderer.prototype.terminateActiveJob = function() {
  if (this.job) {
    this.job.page.statusCode = 503;
    this.job.page.html = '503 Service Unavailable';
    this.job.callback(this.job);
  }
};

/*
 * Handle abnormal rendering engine exits
 */
PrerenderRenderer.prototype.onEngineError = function(msg, trace) {
  if (this.initializeTimer) {
    this.logger.log('error', "Restarting rendering engine in " + this.config.initializeTimeout + " seconds after it failed with error:", msg, trace);
  } else {
    this.logger.log('error', "Restarting rendering engine after it failed with error:", msg, trace);
    this.restartEngine();
  }
};

/*
 * Engine's page object created
 */
PrerenderRenderer.prototype.beforeEngineInit = function(callback) {
  this.pluginEvent('beforeEngineInit', [this, this.engine], callback);
};

/*
 * Rendering engine initialization finished
 */
PrerenderRenderer.prototype.afterEngineInit = function() {
  clearTimeout(this.initializeTimer);
  this.initializeTimer = null;

  var duration = this.hrtimeToMs(process.hrtime(this.startTime));
  this.logger.log('renderer', "Renderer initialized after " + duration + "ms");
  this.busy = false;
  this.config.initializationCallback();
};

/*
 * Serve a page/route from the rendering engine
 */
PrerenderRenderer.prototype.renderPage = function(job) {
  var _this = this;

  this.busy = true;
  this.job = job;
  this.numRequests++;

  var req = this.job.req;
  var res = this.job.res;
  var page = this.job.page;

  this.pluginEvent('beforeRender', [req, res, page], function() {
    _this.job.req = req;
    _this.job.res = res;
    _this.job.page = page;

    if (_this.job.page.statusCode < 500) {
      _this.logger.log('renderer', "Skipped rendering, cached page returned by plugin: " + _this.job.page.url);
      _this.busy = false;
      _this.job.callback(_this.job);
    } else {
      _this.logger.log('renderer', "Rendering: " + _this.job.page.url);
      _this.renderTimer = setTimeout(_.bind(_this.onRenderTimeout, _this), _this.config.renderTimeout);
      _this.engine.loadRoute(_this.job.page, _.bind(_this.afterRender, _this));
    }
  });
};

/*
 * Run post-processing plugins on the page object and notify master when page
 * rendering has completed
 */
PrerenderRenderer.prototype.afterRender = function(page) {
  var _this = this;

  clearTimeout(this.renderTimer);
  this.renderTimer = null;

  this.logger.log('renderer', "Rendering finished");
  if (this.job) {
    var req = this.job.req;
    var res = this.job.res;

    this.pluginEvent('beforeSend', [req, res, page], function() {
      _this.job.req = req;
      _this.job.res = res;
      _this.job.page = page;

      if (_this.numRequests >= _this.config.maxRequestsPerRenderer) {
        if (_this.config.exitAfterMaxRequests) {
          _this.logger.log('error', "Rendering engine reached the maximum allowed number of requests, exiting process");
          if (_this.config.gracefulExit) {
            _this.numRequests = 0;
            _this.busy = false;
            _this.job.callback(_this.job);
          }
          _this.config.terminationCallback();
        } else {
          _this.logger.log('error', "Rendering engine reached the maximum allowed number of requests, restarting engine");
          _.bind(_this.restartEngine, _this)();
        }
      } else {
        _this.busy = false;
        _this.job.callback(_this.job);
      }
    });
  } else {
    this.busy = false;
  }
};

/*
* Job finished and the response has been sent
*/
PrerenderRenderer.prototype.jobFinished = function(job) {
  this.job = null;
  this.pluginEvent('jobFinished', [job]);
};

/*
 * Handle renderer initialization timeouts
 */
PrerenderRenderer.prototype.onInitializeTimeout = function() {
  this.logger.log('error', "Restarting renderer, timed out while initializing");
  this.restartEngine();
};

/*
 * Handle rendering timeouts
 */
PrerenderRenderer.prototype.onRenderTimeout = function() {
  var _this = this;

  if (this.job) {
    this.logger.log('error', "Timed out while rendering: " + this.job.page.url);
    this.terminateActiveJob();
  }

  this.pluginEvent('onRenderTimeout', [_this, this.job], function() {
    _this.busy = false;
  });
};

/*
 * Load and return the plugins
 */
PrerenderRenderer.prototype.loadPlugins = function() {
  var _this = this;
  var plugins = [];

  this.config.plugins.forEach(function(plugin) {
    if (typeof plugin === 'string') {
      plugin = require('./plugins/' + plugin);
    }

    plugins.push(plugin);

    if (typeof plugin.init === 'function') {
      plugin.init(_this);
    }
  });
  return plugins;
};

/*
 * Execute methodName on each plugin
 */
PrerenderRenderer.prototype.pluginEvent = function(methodName, args, callback) {
  var _this = this;
  var index = 0;

  callback = callback || function() {};

  var next = function() {
    var layer = _this.plugins[index++];
    if (!layer) {
      return callback();
    }
    var method = layer[methodName];
    if (method) {
      method.apply(layer, args);
    } else {
      next();
    }
  };

  args.push(next);
  next();
};

/*
 * Start the rendering engine
 */
PrerenderRenderer.prototype.loadEngine = function() {
  var PrerenderEngine;
  switch (this.config.engine) {
    case 'jsdom':
      PrerenderEngine = require('./engines/jsdom.js');
      break;
    case 'phantom':
      PrerenderEngine = require('./engines/phantom.js');
      break;
    case 'webdriver':
      PrerenderEngine = require('./engines/webdriver.js');
      break;
    default:
      this.logger.log('error', "No engine was specified, valid options: jsdom, phantom, webdriver");
      process.exit(2);
  }
  return new PrerenderEngine(this.config, this.logger);
};

/*
 * Convert hrtime to milliseconds
 */
PrerenderRenderer.prototype.hrtimeToMs = function(hr) {
  return (hr[0] * 1000 + parseInt(hr[1] / 1000000, 10));
};

module.exports = PrerenderRenderer;
