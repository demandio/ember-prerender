var jsdom = require('jsdom');
var _ = require('lodash');
var d = require('domain').create();

function JSDomEngine(config, logger) {
  this.config = config;
  this.logger = logger;
  this.config.engineSettings = {
    FetchExternalResources: ['script', 'iframe'],
    ProcessExternalResources: ['script', 'iframe'],
    MutationEvents: '2.0',
    QuerySelector: false
  };
}

/*
 * Initialize the page
 */
JSDomEngine.prototype.init = function(html, initCallback, errorCallback, beforeInitCallback) {
  var _this = this;

  this.initializationCallback = initCallback;
  this.hasInitializationCallback = true;
  this.errorCallback = errorCallback;
  this.beforeInitCallback = beforeInitCallback;

  d.on('error', function(error) {
    _this.logger.log('error', 'JSDOM encountered a fatal error:', error.message);
    process.exit(1);
  });

  d.run(function() {
    try {
      _this.beforeInitCallback(function() {
        _this.document = jsdom.jsdom(html, jsdom.defaultLevel, {
          url: _this.config.baseUrl,
          features: _this.config.engineSettings
        });
        _this.document.addEventListener('XContentReady', _.bind(_this.onPageReady, _this));
        _this.window = _this.document.parentWindow;
        _this.window.isPrerender = true;
        //_this.window.onerror = this.errorCallback;  // Not implemented by JSDOM
        _this.window.resizeTo(1024, 768);
        _this.window.location.href = _this.config.baseUrl + _this.config.initializeUrl;
        _this.window.navigator.mimeTypes = []; // Not implememented by JSDOM
        _this.bindConsole();
      });
    } catch (error) {
      this.errorCallback(error.message);
    }
  });
};

/*
 * Load a route
 */
JSDomEngine.prototype.loadRoute = function(page, callback) {
  this.currentPage = page;
  this.pageCallback = callback;
  this.hasPageCallback = true;

  var _this = this;

  // XXX: JSDOM does not currently support push state so update window.location manually
  var urlParts = page.url.split('?');
  this.window.location.href = this.config.baseUrl.substr(0, this.config.baseUrl.length - 1) + urlParts[0];
  this.window.location.search = urlParts[1] || '';

  d.run(function() {
    try {
      _this.window.prerenderTransitionEvent.url = page.url;
      _this.window.document.dispatchEvent(_this.window.prerenderTransitionEvent);
    } catch (error) {
      _this.logger.log('error', 'JSDOM encountered an error while loading the route:', error.message);
    }
  });
};

/*
 * Callback handler for when a page finishes loading
 */
JSDomEngine.prototype.onPageReady = function() {
  var _this = this;

  if (this.hasInitializationCallback) {
    this.hasInitializationCallback = false;
    this.initializationCallback();
  } else {
    setTimeout(function() {
      if (_this.hasPageCallback) {
        _this.hasPageCallback = false;
        var html = _this.window.document.documentElement.outerHTML;
        if (_this.window.document.doctype) {
          html = "<!DOCTYPE " + _this.window.document.doctype.name + ">\n" + html;
        }
        _this.currentPage.statusCode = 200;
        _this.currentPage.html = html;
        _this.pageCallback(_this.currentPage);
      }
    }, this.config.contentReadyDelay);
  }
};

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
        //console.log(error);
        _this.logger.log('error', error.message);
      }
    });
    this.document.errors = [];
  }
};

module.exports = JSDomEngine;
