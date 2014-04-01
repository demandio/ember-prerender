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
JSDomEngine.prototype.init = function(html, initCallback, errorCallback) {
  this.initializationCallback = initCallback;
  this.errorCallback = errorCallback;

  try {
    jsdom.defaultDocumentFeatures = this.config.engineSettings;
    this.document = jsdom.jsdom(html);
    this.window = this.document.parentWindow;
    this.window.isPrerender = true;
    this.window.onError = this.errorCallback;
    this.window.resizeTo(1024, 768);
    this.window.location.href = this.config.baseUrl;
    this.window.navigator.mimeTypes = []; // Temp fix
    this.bindConsole();
    this.document.addEventListener('prerenderReady', _.bind(this.onPageReady, this));
  } catch (error) {
    this.errorCallback(error.message);
  }
};

/*
 * Load a route
 */
JSDomEngine.prototype.loadRoute = function(page, callback) {
  this.currentPage = page;
  this.pageCallback = callback;

  // XXX: JSDOM does not currently support push state so update window.location manually
  var urlParts = page.url.split('?');
  this.window.location.href = this.config.baseUrl.substr(0, this.config.baseUrl.length - 1) + urlParts[0];
  this.window.location.search = urlParts[1] || '';

  try {
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
  } catch (error) {
    this.logger.log('error', 'JSDOM encountered an error while loading the route:', error.message);
  }
};

/*
 * Callback handler for wwhen a page finishes loading
 */
JSDomEngine.prototype.onPageReady = function(event) {
  if (this.initializationCallback) {
    this.initializationCallback();
    this.initializationCallback = null;
  }

  if (this.pageCallback) {
    var html = this.window.document.documentElement.outerHTML;
    if (this.window.document.doctype) {
      html = "<!DOCTYPE " + this.window.document.doctype.name + ">\n" + html;
    }
    this.currentPage.statusCode = 200;
    this.currentPage.html = html;
    this.pageCallback(this.currentPage);
    this.pageCallback = null;
  }
}

/*
 * Destroy the jsdom document
 */
JSDomEngine.prototype.shutdown = function() {
  this.window.close();
  clearInterval(this.errorTimer);
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

  // Error messages are currently a special case
  this.errorTimer = setInterval(_.bind(this.logErrors, this), 2000);
};

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

module.exports = JSDomEngine;
