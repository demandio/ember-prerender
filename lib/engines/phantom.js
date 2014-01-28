var _ = require('lodash');
var phantomjs = require('phantomjs');
var phantom = require('phantom');

function PhantomEngine(config, logger) {
  this.config = config;
  this.logger = logger;

  this.config.engineSettings = {
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
PhantomEngine.prototype.init = function(workerId, page, callback) {
  var _this = this;

  // XXX: Implement a better way for assigning each worker a unique base port
  //this.config.engineSettings.port += (workerId % 1000);
  this.config.engineSettings.onExit = function() {
    // TODO: Logging
    process.exit(0);
  };

  this.phantom = phantom.create("--debug=false", this.config.engineSettings, function(ph) {
    _this.phantom.ph = ph;
    _this.phantom.ph.createPage(function(phantomPage) {
      _this.phantom.page = phantomPage;
      _this.phantom.page.set('onConsoleMessage', function(msg) {
        _this.logger.log('debug', '>>>', msg);
      });
      _this.phantom.page.set('onCallback', _.bind(_this.onPageReady, _this));
      _this.phantom.page.setContent(page.html, _this.config.baseUrl, function() {
        _this.phantom.page.evaluate(
          function() {
            try {
              document.addEventListener('prerenderReady', function() {
                window.callPhantom();
              }, false);
              return true;
            } catch (e) { }
            return false;
          },
          function (result) {
            if (result) {
              callback();
            }
          }
        );
      });
    });
  });
};

/*
 * Load a route
 */
PhantomEngine.prototype.loadRoute = function(page, callback) {
  var willTransition = (!this.currentPage || this.currentPage.url.split('?')[0] != page.url.split('?')[0]);

  this.currentCallback = callback;
  this.currentPage = page;

  if (willTransition) {
    this.phantom.page.evaluate(function(pageUrl) {
      var container = App.__container__;
      var router = container.lookup('router:main');
      Ember.run(function() {
        router.handleURL(pageUrl);
      });
    }, null, page.url);
  } else {
    this.onPageReady();
  }
};

/*
 * Callback handler for when a page finishes rendering
 */
PhantomEngine.prototype.onPageReady = function() {
  var _this = this;

  this.phantom.page.evaluate(
    function() {
      try {
        var html = document.documentElement.outerHTML.toString();
        if (document.doctype) {
          html = "<!DOCTYPE " + this.window.document.doctype.name + ">\n" + html;
        }
        return html;
      } catch (e) { }
      return false;
    },
    function (result) {
      if (result) {
        _this.currentPage.statusCode = 200;
        _this.currentPage.html = result;
        _this.currentCallback(_this.currentPage);
      }
    }
  );
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
