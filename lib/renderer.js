var PrerenderLogger = require('./logger');
var _ = require('lodash');
var fs = require('fs');

function PrerenderRenderer(config) {
  this.config = config;
  this.logger = new PrerenderLogger(this.config.logging, 'Renderer');
  this.plugins = this.loadPlugins();
  this.engine = this.loadEngine();

  process.on('SIGUSR2', _.bind(function() {
    this.stopEngine();
    this.start();
  }, this));
};

/*
 * Start up the renderer
 */
PrerenderRenderer.prototype.start = function(callback) {
  var html = this.getApplicationHtml(this.config.applicationPage);
  this.pluginEvent(
    'beforeInit',
    [html],
    _.bind(this.startEngine, this, html, callback)
  );
};

/*
 * Initialize the rendering engine (JSDOM, PhantomJS, etc)
 */
PrerenderRenderer.prototype.startEngine = function(html, callback) {
  this.logger.log('renderer', "Engine starting up");

  this.numRequests = 0;
  this.startTime = process.hrtime();
  this.initializeTimer = setTimeout(_.bind(this.onInitializeTimeout, this), this.config.renderTimeout);

  this.engine.init(
    html,
    _.bind(this.afterEngineInit, this, callback),
    _.bind(this.onEngineError, this)
  );
};

/*
 * Shutdown the rendering engine
 */
PrerenderRenderer.prototype.stopEngine = function() {
  this.logger.log('renderer', "Engine shutting down");
  this.engine.destroyPage();
};

/*
 * Restart the rendering engine
 */
PrerenderRenderer.prototype.restartEngine = function() {
  this.stopEngine();
  this.startEngine();
};

/*
 * Handle abnormal rendering engine exits
 */
PrerenderRenderer.prototype.onEngineError = function(msg) {
  if (this.job) {
    clearTimeout(this.renderTimer);
    this.job.callback(this.job.page);
    this.job = null;
  } else {
    clearTimeout(this.initializeTimer);
  }

  this.logger.log('error', "Rendering engine failed with error:", msg);
  this.restartEngine();
};

/*
 * Rendering engine initialization finished
 */
PrerenderRenderer.prototype.afterEngineInit = function(callback, err) {
  clearTimeout(this.initializeTimer);

  if (err) {
    this.logger.log('error', "Renderer initialization failed: " + err);
    process.exit(1);
  } else {
    var duration = this.hrtimeToMs(process.hrtime(this.startTime));
    this.logger.log('renderer', "Renderer initialized after " + duration + "ms");
    callback();
  }
};

/*
 * Serve a page/route from the rendering engine
 */
PrerenderRenderer.prototype.renderPage = function(job) {
  this.job = job;
  this.numRequests++;
  this.logger.log('renderer', "Rendering: " + this.job.page.url);
  this.renderTimer = setTimeout(_.bind(this.onRenderTimeout, this), this.config.renderTimeout);

  this.pluginEvent('beforeRender', [this.job.page], _.bind(function() {
    if (this.job.page.statusCode >= 200 && this.job.page.statusCode < 400) {
      this.logger.log('renderer', "Skipped rendering, cached page returned by plugin");
      this.job.callback(this.job.page);
    } else {
      this.engine.loadRoute(this.job.page, _.bind(this.afterRender, this));
    }
  }, this));
};

/*
 * Run post-processing plugins on the page object and notify master when page
 * rendering has completed
 */
PrerenderRenderer.prototype.afterRender = function(page) {
  clearTimeout(this.renderTimer);

  this.logger.log('renderer', "Rendering finished");
  this.pluginEvent('beforeSend', [page], _.bind(function() {
    this.job.callback(page);
  }, this));

  if (this.numRequests >= this.config.maxRequestsPerRenderer) {
    this.logger.log('renderer', "Rendering engine reached the maximum allowed number of requests, restarting engine");
    this.restartEngine();
  }
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
  this.logger.log('error', "Restarting renderer, timed out while rendering: " + this.job.url);
  this.restartEngine();
};

/*
 * Read and prepare the html page that's being rendered
 */
PrerenderRenderer.prototype.getApplicationHtml = function(filename) {
  var html = fs.readFileSync(this.config.assetsPath + filename, 'utf-8');

  // Add a system path to relative and absolute script URLs so they can be loaded directly
  var scriptRe = /<script[^>]+src=['"](?!https?:\/\/)(.+)['"][^>]*><\/script>/gi;
  var match;
  var replacements = [];
  while ((match = scriptRe.exec(html)) !== null) {
    filename = this.config.assetsPath + match[1].replace('../', '');
    replacements.push([match[0], '<script src="file://' + filename + '"></script>']);
  }
  replacements.forEach(function(replacement) {
    html = html.replace(replacement[0], replacement[1]);
  });

  return html;
};

/*
 * Load and return the plugins
 */
PrerenderRenderer.prototype.loadPlugins = function() {
  var plugins = [];
  this.config.plugins.forEach(function(name) {
    var plugin = require('./plugins/' + name);
    plugins.push(plugin);
    if (typeof plugin.init === 'function') {
      plugin.init(_this)
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
  }

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
    default:
      PrerenderEngine = require('./engines/phantom.js');
  }
  return new PrerenderEngine(this.config, this.logger);
};

/*
 * Convert hrtime to milliseconds
 */
PrerenderRenderer.prototype.hrtimeToMs = function(hr) {
  return (hr[0] * 1000 + parseInt(hr[1] / 1000000));
};

module.exports = PrerenderRenderer;
