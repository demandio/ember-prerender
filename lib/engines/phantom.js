var _ = require('lodash');
var phantomjs = require('phantomjs');
var phantom = require('phantom');

function PhantomEngine(config, logger) {
  this.config = config;
  this.logger = logger;
  this.loaded = false;
  this.engineSettings = {
    port: this.config.phantomPort || this.config.port * 10,
    binary: phantomjs.path,
    userAgent: 'Prerender',
    loadImages: false,
    localToRemoteUrlAccessEnabled: true,
    webSecurityEnabled: true
  };
};

/*
 * Initialize the page
 */
PhantomEngine.prototype.init = function(html, initCallback, errorCallback) {
  var _this = this;

  this.currentCallback = initCallback;

  this.engineSettings.onExit = function(err, signal) {
    _this.logger.log('error', "PhantomJS process exited unexpectedly");
    errorCallback();
  };

  this.phantom = phantom.create("--debug=false", this.engineSettings, function(ph) {
    _this.phantom.ph = ph;
    _this.phantom.ph.createPage(function(phantomPage) {
      _this.phantom.page = phantomPage;
      _this.phantom.page.set('viewportSize', {
        width: 1024,
        height: 768
      });
      _this.phantom.page.set('onError', function(msg, err) {
        _this.logger.log('error', msg, err);
        errorCallback();
      });
      _this.phantom.page.set('onConsoleMessage', function(msg) {
        _this.logger.log('debug', '>>>', msg);
      });
      _this.phantom.page.set('onCallback', _.bind(_this.onPageReady, _this));
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
};

/*
 * Load a route
 */
PhantomEngine.prototype.loadRoute = function(page, callback) {
  this.currentPage = page;
  this.currentCallback = callback;

  this.phantom.page.evaluate(function(pageUrl) {
    // Ember-specific code
    var router = App.__container__.lookup('router:main');
    Ember.run(function() {
      router.replaceWith(pageUrl).then(function(route) {
        if (route.handlerInfos) {
          // The same route was loaded twice
          App.prerenderReady();
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

  if (!this.loaded) {
    this.loaded = true;
    if (this.currentCallback) {
      this.currentCallback();
      this.currentCallback = null;
    }
  } else {
    this.phantom.page.evaluate(
      function() {
        var html = document.documentElement.outerHTML;
        if (document.doctype) {
          html = "<!DOCTYPE " + document.doctype.name + ">\n" + html;
        }
        return html;
      },
      function (html) {
        _this.currentPage.statusCode = 200;
        _this.currentPage.html = html;
        if (_this.currentCallback) {
          _this.currentCallback(_this.currentPage);
          _this.currentCallback = null;
        }
      }
    );
  }
};

/*
 * Destroy the page
 */
PhantomEngine.prototype.destroyPage = function() {
  if (this.phantom && this.phantom.ph) {
    this.phantom.ph.exit();
  }
};

module.exports = PhantomEngine;
