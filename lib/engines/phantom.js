var _ = require('lodash');
var phantomjs = require('phantomjs');
var phantom = require('phantom');

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
PhantomEngine.prototype.init = function(html, initCallback, errorCallback, beforeInitCallback) {
  var _this = this;

  this.initializationCallback = initCallback;
  this.hasInitializationCallback = true;

  this.engineSettings.onExit = function(code, signal) {
    if (code !== 0) {
      errorCallback("Erroneous exit code: " + code, signal);
    }
  };

  this.phantom = phantom.create("--load-images=no", this.engineSettings, function(ph) {
    _this.phantom.ph = ph;
    _this.phantom.ph.createPage(function(phantomPage) {
      _this.phantom.page = phantomPage;
      _this.phantom.page.set('onConsoleMessage', function(msg) {
        _this.logger.log('debug', '>>>', msg);
      });
      _this.phantom.page.set('onCallback', _.bind(_this.onPageReady, _this));
      _this.phantom.page.set('onError', function(msg) {
        errorCallback("Phantom encountered an error: " + msg);
      });
      _this.phantom.page.set('onResourceError', function(error) {
        if (error.url != '') {
          _this.logger.log('error', "Phantom encountered an error loading a resource:", error);
        }
      });
      _this.phantom.page.set('viewportSize', {
        width: 1024,
        height: 768
      });
      // Add the event listener to the html, since calling page.evaluate happens too late
      html += "<script>" +
                "this.isPrerender = true;" +
                "document.addEventListener('XContentReady', function() {" +
                  "window.callPhantom();" +
                "}, false);" +
              "</script>";
      beforeInitCallback(function() {
        _this.phantom.page.setContent(html, _this.config.baseUrl + _this.config.initializeUrl);
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
  this.hasPageCallback = true;

  this.phantom.page.evaluate(function(url) {
    window.prerenderTransitionEvent.url = url;
    document.dispatchEvent(window.prerenderTransitionEvent);
  }, null, page.url);
};

/*
 * Callback handler for when a page finishes rendering
 */
PhantomEngine.prototype.onPageReady = function() {
  var _this = this;

  if (this.hasInitializationCallback) {
    this.hasInitializationCallback = false;
    this.initializationCallback();
  } else {
    setTimeout(function() {
      _this.phantom.page.evaluate(
        function() {
          var html = document.documentElement.outerHTML;
          if (document.doctype) {
            html = "<!DOCTYPE " + document.doctype.name + ">\n" + html;
          }
          return html;
        },
        function (html) {
          if (_this.hasPageCallback) {
            _this.hasPageCallback = false;
            _this.currentPage.statusCode = 200;
            _this.currentPage.html = html;
            _this.pageCallback(_this.currentPage);
          }
        }
      );
    }, this.config.contentReadyDelay);
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
