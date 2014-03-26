var PrerenderLogger = require('./logger');
var _ = require('lodash');
var fs = require('fs');

function PrerenderRenderer(config) {
  this.config = config;
  this.logger = new PrerenderLogger(this.config.loggingx);
  this.plugins = this.loadPlugins();
};

/*
 * Start up the renderer worker
 */
PrerenderRenderer.prototype.start = function(callback) {
  this.logger.log('renderer', "Starting up");

  var page = {
    html: this.getApplicationPage(this.config.applicationPage)
  };
  this.pluginEvent(
    'beforeInit',
    [page],
    _.bind(this.rendererInit, this, page, callback)
  );

  process.on('SIGUSR2', _.bind(this.restartEngine, this));
};

/*
 * Initialize the rendering engine (JSDOM, PhantomJS, etc)
 */
PrerenderRenderer.prototype.rendererInit = function(page, callback) {
  this.engine.init(
    page,
    _.bind(this.afterRendererInit, this, callback),  // Success
    _.bind(this.afterRendererInit, this, callback)   // Failure
  );
};

/*
 * Handle renderer initialization timeouts
 */
PrerenderServer.prototype.onInitializeTimeout = function() {
  this.logger.log('error', "Restarting renderer, timed out while initializing");
  this.restartRenderer();
};

/*
 * Handle rendering timeouts
 */
PrerenderServer.prototype.onRenderTimeout = function() {
  this.logger.log('error', "Restarting renderer, timed out while rendering: " + this.job.url);
  this.restartRenderer();
};

/*
 * Start the renderer
 */
PrerenderServer.prototype.startRenderer = function() {
  this.startTime = process.hrtime();
  this.initializeTimer = setTimeout(_.bind(this.onInitializeTimeout, this), this.config.renderTimeout);
  this.renderer = new PrerenderRenderer(this.config, _.bind(this.onRendererExit, this));
};

/*
 * Handle abnormal rendering engine exits
 */
/*
PrerenderServer.prototype.onRendererExit = function(code, signal) {
  if (this.job) {
    clearTimeout(this.renderTimer);
    this.job.callback(this.job.req, this.job.res);
    this.job = null;
  }

  if (code == 0) {
    this.logger.log('server', "Renderer exited");
  } else {
    this.logger.log('error', "Renderer exited with unknown error code:", signal || code);
  }
  this.startRenderer();
};
*/

/*
 * Notify master after rendering engine initialization finished
 */
PrerenderRenderer.prototype.afterRendererInit = function(callback, err) {
  if (err) {
    this.logger.log('error', "Renderer initialization error: " + err);
    this.shutdown(1);
  } else {
    clearTimeout(this.initializeTimer);
    var duration = this.hrtimeToMs(process.hrtime(this.startTime));
    this.logger.log('renderer', "Renderer initialized after " + duration + "ms");
  }
  callback(err);
};

/*
 * Serve a page/route from the rendering engine
 */
PrerenderRenderer.prototype.renderRoute = function(page) {
  var _this = this;

  this.logger.log('renderer', "Rendering: " + page.url);
  this.numRequests++;

  this.pluginEvent('beforeRender', [page], function() {
    if (page.statusCode >= 200 && page.statusCode < 400) {
      _this.logger.log('renderer', "Skipped rendering, cached page returned by plugin");
      process.send({
        event: 'finished',
        page: page
      });
    } else {
      _this.engine.loadRoute(page, _.bind(_this.afterRender, _this));
    }
  });
};

/*
 * Run post-processing plugins on the page object and notify master when page
 * rendering has completed
 */
PrerenderRenderer.prototype.afterRender = function(page, err) {
  if (err) {
    this.logger.log('renderer', 'Render error: ' + err);
  } else {
    this.logger.log('renderer', "Rendering finished");

    this.pluginEvent('beforeSend', [page], function() {
      process.send({
        event: 'finished',
        page: page
      });
    });
  }

  if (err || this.numRequests >= this.config.maxRequestsPerRenderer) {
    this.logger.log('renderer', "Rendering engine reached the maximum allowed number of requests, restarting engine");
    this.restartEngine();
  }
};

/*
 * Start the rendering engine
 */
PrerenderRenderer.prototype.startEngine = function() {
  this.logger.log('renderer', "Engine starting up");

  this.numRequests = 0;
  this.startTime = process.hrtime();

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
 * Read and prepare the html page that's being rendered
 */
PrerenderRenderer.prototype.getApplicationPage = function(filename) {
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

module.exports = PrerenderRenderer;
