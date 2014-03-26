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
JSDomEngine.prototype.init = function(html, initCallback, errorCallback) {
  this.currentCallback = initCallback;

  jsdom.defaultDocumentFeatures = this.config.engineSettings;
  this.document = jsdom.jsdom(html);
  this.document.addEventListener('prerenderReady', _.bind(this.onPageReady, this));
  this.window = this.document.parentWindow;
  this.window.onError = errorCallback;
  this.window.resizeTo(1024, 768);
  this.window.isPrerender = true;
  this.window.location.href = this.config.baseUrl;
  this.bindConsole();
};

/*
 * Load a route
 */
JSDomEngine.prototype.loadRoute = function(page, callback) {
  var _this = this;

  this.currentPage = page;
  this.currentCallback = callback;

  // XXX: JSDOM does not currently support push state so update window.location manually
  var urlParts = page.url.split('?');
  this.window.location.href = this.config.baseUrl.substr(0, this.config.baseUrl.length - 1) + urlParts[0];
  this.window.location.search = urlParts[1] || '';

  // Ember-specific code
  var router = this.window.App.__container__.lookup('router:main');
  this.window.Ember.run(function() {
    router.replaceWith(page.url).then(function(route) {
      if (route.handlerInfos) {
        // The same route was loaded twice
        this.window.App.prerenderReady();
      }
    });
  });
};

/*
 * Callback handler for wwhen a page finishes loading
 */
JSDomEngine.prototype.onPageReady = function(event) {
  _.bind(this.logErrors, this)();

  if (this.currentCallback) {
    if (!this.loaded) {
      this.loaded = true;
      this.currentCallback();
    } else {
      var html = this.window.document.documentElement.outerHTML;
      if (this.window.document.doctype) {
        html = "<!DOCTYPE " + this.window.document.doctype.name + ">\n" + html;
      }
      this.currentPage.statusCode = 200;
      this.currentPage.html = html;
      this.currentCallback(this.currentPage);
    }
    this.currentCallback = null;
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
