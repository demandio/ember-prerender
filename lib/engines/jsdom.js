var jsdom = require('jsdom');
var _ = require('lodash');

function JSDomEngine(config, logger) {
  this.config = config;
  this.logger = logger;

  this.config.engineSettings = {
    FetchExternalResources: ['script', 'iframe'],
    ProcessExternalResources: ['script', 'iframe'],
    MutationEvents: '2.0',
    QuerySelector: false
  };
};

/*
 * Initialize the page
 */
JSDomEngine.prototype.init = function(workerId, page, callback) {
  jsdom.defaultDocumentFeatures = this.config.engineSettings;
  this.document = jsdom.jsdom(page.html);
  this.window = this.document.parentWindow;
  this.window.isPrerender = true;
  this.window.location.href = this.config.baseUrl;
  this.bindConsole();

  setTimeout(_.bind(this.checkForInit, this, page, callback), this.config.renderCheckInterval);
};

/*
 * Check for page initialization
 */
JSDomEngine.prototype.checkForInit = function(page, callback) {
  if (this.window.prerenderReady) {
    _.bind(this.logErrors, this)();
    callback();
  } else {
    setTimeout(_.bind(this.checkForInit, this, page, callback), this.config.renderCheckInterval);
  }
}

/*
 * Load a route
 */
JSDomEngine.prototype.loadRoute = function(page, callback) {
  var fullUrl = this.config.baseUrl.substr(0, this.config.baseUrl.length - 1) + page.url;
  this.window.location.href = fullUrl;
  this.window.App.Router.router.replaceWith(page.url);

  setTimeout(_.bind(this.checkForLoad, this, page, callback), this.config.renderCheckInterval);
};

/*
 * Check for route initialization
 */
JSDomEngine.prototype.checkForLoad = function(page, callback) {
  if (!this.window.jQuery.active) {
    // TODO: Improve ready checking
    _.bind(this.logErrors, this)();
    var html = this.window.document.documentElement.outerHTML.toString();
    if (this.window.document.doctype) {
      html = "<!DOCTYPE " + this.window.document.doctype.name + ">\n" + html;
    }
    page.statusCode = 200;
    page.html = html;

    callback(page);
  } else {
    setTimeout(_.bind(this.checkForLoad, this, page, callback), this.config.renderCheckInterval);
  }
}

/*
 * Log script errors
 */
JSDomEngine.prototype.logErrors = function() {
  var _this = this;

  if (this.document.errors.length > 0) {
    this.document.errors.forEach(function(error) {
      if (error.message.indexOf('NOT IMPLEMENTED') === -1) {
        _this.logger.log('error', error.message);
      }
    });
    this.document.errors = [];
  }
};

/*
 * Destroy the page
 */
JSDomEngine.prototype.destroyPage = function() {
  this.window.close();
};

/*
 * Bind JSDom console logging output to PrerenderLogger debug log
 */
JSDomEngine.prototype.bindConsole = function() {
  var _this = this;
  var methods = ['log', 'debug', 'info', 'warn', 'error'];

  methods.forEach(function(method) {
    _this.window.console[method] = function() {
      var args = [].slice.call(arguments);
      args.unshift('debug', '>>>');
      return _this.logger.log.apply(_this.logger, args);
    };
  });
};

module.exports = JSDomEngine;
