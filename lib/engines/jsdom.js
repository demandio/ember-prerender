var jsdom = require('jsdom');
var _ = require('lodash');

function JSDomEngine(config, logger) {
  this.config = config;
  this.logger = logger;
  this.loaded = false;

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
  this.currentCallback = callback;

  jsdom.defaultDocumentFeatures = this.config.engineSettings;
  this.document = jsdom.jsdom(page.html);
  this.document.addEventListener('prerenderReady', _.bind(this.onPageReady, this));
  this.window = this.document.parentWindow;
  this.window.isPrerender = true;
  this.window.location.href = this.config.baseUrl;
  this.bindConsole();
};

/*
 * Load a route
 */
JSDomEngine.prototype.loadRoute = function(page, callback) {
  var willTransition = (!this.currentPage && page.url.split('?')[0] != '/') ||
                       (this.currentPage && this.currentPage.url.split('?')[0] != page.url.split('?')[0]);

  this.currentPage = page;
  this.currentCallback = callback;

  if (willTransition) {
    var urlParts = page.url.split('?');
    var fullUrl = this.config.baseUrl.substr(0, this.config.baseUrl.length - 1) + urlParts[0];
    this.window.location.href = fullUrl;
    this.window.location.search = urlParts[1] || '';

    var container = this.window.App.__container__;
    var router = container.lookup('router:main');
    this.window.Ember.run(function() {
      router.handleURL(page.url);
    });
  } else {
    this.onPageReady();
  }
};

/*
 * Callback handler for wwhen a page finishes loading
 */
JSDomEngine.prototype.onPageReady = function() {
  if (!this.loaded) {
      _.bind(this.logErrors, this)();
      this.loaded = true;
      this.currentCallback();
  } else {
    _.bind(this.logErrors, this)();
    var html = this.window.document.documentElement.outerHTML.toString();
    if (this.window.document.doctype) {
      html = "<!DOCTYPE " + this.window.document.doctype.name + ">\n" + html;
    }
    this.currentPage.statusCode = 200;
    this.currentPage.html = html;
    this.currentCallback(this.currentPage);
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
