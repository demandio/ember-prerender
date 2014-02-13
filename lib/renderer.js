var PrerenderLogger = require('./logger');
var _ = require('lodash');
var cluster = require('cluster');
var fs = require('fs');

function PrerenderRenderer(config) {
  this.config = config;
  this.logger = new PrerenderLogger(this.config.logging, 'Renderer ' + cluster.worker.id);
  this.plugins = this.getPlugins();
  this.engine = this.getRenderer();
};

/*
 * Launch the prerender server
 */
PrerenderRenderer.prototype.start = function() {
  this.logger.log('renderer', "Starting up");

  process.on('SIGUSR2', function() {});
  process.on('message', _.bind(this.onMasterMessage, this));

  var page = {
    html: this.getApplicationPage(this.config.applicationPage)
  };
  this.pluginEvent(
    'beforeInit',
    [page],
    _.bind(this.rendererInit, this, page)
  );
};

/*
 * Initialize the renderer
 */
PrerenderRenderer.prototype.rendererInit = function(page) {
  this.engine.init(
    cluster.worker.id,
    page,
    _.bind(this.afterRendererInit, this),
    _.bind(this.shutdown, this, 1)
  );
};

/*
 * Notify master after rendering engine initialization finished
 */
PrerenderRenderer.prototype.afterRendererInit = function(err) {
  if (err) {
    this.logger.log('error', "Renderer initialization error: " + err);
    this.shutdown(1);
  } else {
    this.logger.log('renderer', "Finished initializing");
    process.send({
      event: 'initialized'
    });
  }
};

/*
 * Handle master messages
 */
PrerenderRenderer.prototype.onMasterMessage = function(msg) {
  switch (msg.event) {
    case 'render':
      this.renderRoute(msg.page);
      break;
    case 'shutdown':
      this.shutdown(0);
      break;
  }
};

/*
 * Serve a route from the rendering engine
 */
PrerenderRenderer.prototype.renderRoute = function(page) {
  var _this = this;

  this.logger.log('renderer', "Rendering: " + page.url);

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
 * Run post-processing plugins and notify master when page rendering is finished
 */
PrerenderRenderer.prototype.afterRender = function(page, err) {
  if (err) {
    this.logger.log('renderer', 'Renderer render error: ' + err);
    this.disconnect();
  } else {
    this.logger.log('renderer', "Rendering finished");

    this.pluginEvent('beforeSend', [page], function() {
      process.send({
        event: 'finished',
        page: page
      });
    });
  }
};

/*
 * Shutdown the worker
 */
PrerenderRenderer.prototype.shutdown = function(exitCode) {
  this.logger.log('renderer', "Worker " + cluster.worker.id + " shutting down");
  this.engine.destroyPage();
  process.exit(exitCode);
};

/*
 * Get the html page to render
 */
PrerenderRenderer.prototype.getApplicationPage = function(filename) {
  var html = fs.readFileSync(this.config.assetsPath + filename, 'utf-8');

  // Add full system path to relative and absolute script URLs
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
 * Load the rendering engine
 */
PrerenderRenderer.prototype.getRenderer = function() {
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
 * Load and return the plugins
 */
PrerenderRenderer.prototype.getPlugins = function() {
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
 * Executes methodName on each plugin
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
