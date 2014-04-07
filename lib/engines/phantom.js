var _ = require('lodash');
var phantomjs = require('phantomjs');
var phantom = require('phantom');
var portscanner = require('portscanner');

function PhantomEngine(config, logger) {
  this.config = config;
  this.logger = logger;
  this.engineSettings = {
    binary: phantomjs.path,
    userAgent: 'Prerender',
    loadImages: false,
    localToRemoteUrlAccessEnabled: true,
    webSecurityEnabled: true
  };
}

/*
 * Initialize the page
 */
PhantomEngine.prototype.init = function(html, initCallback, errorCallback) {
  var _this = this;

  this.initializationCallback = initCallback;

  this.engineSettings.onExit = function(code, signal) {
    if (code !== 0) {
      errorCallback("Erroneous exit code: " + code, signal);
    }
  };

  this.engineSettings.port = portscanner.findAPortNotInUse(this.config.phantomPortStart, this.config.phantomPortEnd, 'localhost', function(err, freePort) {
    _this.engineSettings.port = freePort;

    _this.phantom = phantom.create("--load-images=no", _this.engineSettings, function(ph) {
      _this.phantom.ph = ph;
      _this.phantom.ph.createPage(function(phantomPage) {
        _this.phantom.page = phantomPage;
        _this.phantom.page.set('onConsoleMessage', function(msg) {
          _this.logger.log('debug', '>>>', msg);
        });
        _this.phantom.page.set('onCallback', _.bind(_this.onPageReady, _this));
        _this.phantom.page.set('onError', function(msg) {
          _this.logger.log('error', "Phantom encountered an error:", msg);
        });
        _this.phantom.page.set('onResourceError', function(msg) {
          _this.logger.log('error', "Phantom encountered an error loading a resource:", msg);
        });
        _this.phantom.page.set('viewportSize', {
          width: 1024,
          height: 768
        });
        _this.phantom.page.set('onInitialized', function() {
          _this.phantom.page.evaluate(function() {
            window.isPrerender = true;
            document.addEventListener('prerenderReady', function() {
              window.callPhantom();
            }, false);
          });
        });
        _this.phantom.page.setContent(html, _this.config.baseUrl);
      });
    });
  });
};

/*
 * Load a route
 */
PhantomEngine.prototype.loadRoute = function(page, callback) {
  this.currentPage = page;
  this.pageCallback = callback;

  this.phantom.page.evaluate(function(pageUrl) {
    // Ember-specific code
    var router = window.App.__container__.lookup('router:main');
    Ember.run(function() {
      router.replaceWith(pageUrl).then(function(route) {
        if (route.handlerInfos) {
          // The same route was loaded twice
          window.App.prerenderReady();
        }
      });
    });
  }, null, page.url);
};

/*
 * Callback handler for when a page finishes rendering
 */
PhantomEngine.prototype.onPageReady = function() {
  var _this = this;

  if (this.initializationCallback) {
    this.initializationCallback();
    this.initializationCallback = null;
  } else if (this.pageCallback) {
    this.phantom.page.evaluate(
      function() {
        var html = document.documentElement.outerHTML;
        if (document.doctype) {
          html = "<!DOCTYPE " + document.doctype.name + ">\n" + html;
        }
        return html;
      },
      function (html) {
        if (_this.pageCallback) {
          _this.currentPage.statusCode = 200;
          _this.currentPage.html = html;
          _this.pageCallback(_this.currentPage);
        }
      }
    );
  }
};

/*
 * Destroy the phantom process
 */
PhantomEngine.prototype.shutdown = function() {
  if (this.phantom && this.phantom.ph) {
    this.phantom.ph.exit();
  }
};

module.exports = PhantomEngine;
