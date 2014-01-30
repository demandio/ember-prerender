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
JSDomEngine.prototype.init = function(workerId, page, initCallback, errorCallback) {
  this.currentCallback = initCallback;

  jsdom.defaultDocumentFeatures = this.config.engineSettings;
  this.document = jsdom.jsdom(page.html);
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
  // XXX: The prerenderReady event never gets fired if handleURL() calls the same URL twice,
  //   so the context state is manually being cleared down to the application route
  router.router.currentHandlerInfos.splice(0,1)
  this.window.Ember.run(function() {
    router.replaceWith(page.url).then(null, _.bind(_this.onPageReady, _this, null));
  });
};

/*
 * Callback handler for wwhen a page finishes loading
 */
JSDomEngine.prototype.onPageReady = function(event, err) {
  _.bind(this.logErrors, this)();

  if (this.currentCallback) {
    if (!this.loaded) {
      this.loaded = true;
      this.currentCallback();
    } else {
      if (err) {
        this.logger.log('error', "Handling the URL failed with error:", msg.error);
        this.currentCallback(this.currentPage);
      } else {
        var html = this.window.document.documentElement.outerHTML;
        if (this.window.document.doctype) {
          html = "<!DOCTYPE " + this.window.document.doctype.name + ">\n" + html;
        }
        this.currentPage.statusCode = 200;
        this.currentPage.html = html;
        this.currentCallback(this.currentPage);
      }
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
