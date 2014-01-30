var _ = require('lodash');
var phantomjs = require('phantomjs');
var phantom = require('phantom');

function PhantomEngine(config, logger) {
  this.config = config;
  this.logger = logger;
  this.loaded = false;
  this.engineSettings = {
    port: (this.config.port * 10),
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
PhantomEngine.prototype.init = function(workerId, page, initCallback, errorCallback) {
  var _this = this;

  this.currentCallback = initCallback;

  // XXX: Implement a better way for assigning each worker a unique port
  this.engineSettings.port += (workerId % 1000);

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
      _this.phantom.page.setContent(page.html, _this.config.baseUrl);
    });
  });
};

/*
 * Load a route
 */
PhantomEngine.prototype.loadRoute = function(page, callback) {
  this.currentCallback = callback;
  this.currentPage = page;

  // Ember-specific code
  this.phantom.page.evaluate(function(pageUrl) {
    var router = App.__container__.lookup('router:main');
    // XXX: The prerenderReady event never gets fired if handleURL() calls the same URL twice,
    //   so the context state is manually being cleared - there may be a better way to check
    //   for changes such as using partitionHandlers()
    router.router.currentHandlerInfos = [];
    Ember.run(function() {
      router.handleURL(pageUrl).then(null, function(rejection) {
        window.callPhantom({
          error: rejection
        });
      });
    });
  }, null, page.url);
};

/*
 * Callback handler for when a page finishes rendering
 */
PhantomEngine.prototype.onPageReady = function(msg) {
  var _this = this;

  if (this.currentCallback) {
    if (!this.loaded) {
      this.loaded = true;
      this.currentCallback();
      this.currentCallback = null;
    } else {
      if (msg && msg.error) {
        this.logger.log('error', "Handling the URL failed with error:", msg.error);
        this.currentCallback(this.currentPage);
        this.currentCallback = null;
      } else {
        this.phantom.page.evaluate(
          function() {
            var html = document.documentElement.outerHTML.toString();
            if (document.doctype) {
              html = "<!DOCTYPE " + document.doctype.name + ">\n" + html;
            }
            return {
              url: window.location.href,
              html: html
            };
          },
          function (result) {
            if (msg && msg.info) {
              _this.logger.log('debug', "Notice:", msg.info);
            }
            _this.currentPage.statusCode = 200;
            _this.currentPage.html = result.html;
            _this.currentCallback(_this.currentPage);
            _this.currentCallback = null;
          }
        );
      }
    }
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
