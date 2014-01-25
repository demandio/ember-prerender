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
  this.config.engineSettings.port += (workerId % 1000);
  this.config.engineSettings.onExit = function() {
    process.exit(0);
  };

  this.phantom = phantom.create("--debug=false", this.config.engineSettings, function(ph) {
    _this.phantom.ph = ph;
    _this.phantom.ph.createPage(function(phantomPage) {
      _this.phantom.page = phantomPage;
      _this.phantom.page.set('onConsoleMessage', function(msg) {
        _this.logger.log('debug', '>>>', msg);
      });
      _this.phantom.page.setContent(page.html, _this.config.baseUrl);
      setTimeout(_.bind(_this.checkForInit, _this, page, callback), _this.config.renderCheckInterval);
    });
  });
};

/*
 * Check for page initialization
 */
PhantomEngine.prototype.checkForInit = function(page, callback) {
  var _this = this;

  this.phantom.page.evaluate(
    function() {
      if (!window.isPrerender) {
        window.isPrerender = true;
      }
      return window.prerenderReady;
    },
    function(result) {
      if (result === true) {
        callback();
      } else {
        setTimeout(_.bind(_this.checkForInit, _this, page, callback), _this.config.renderCheckInterval);
      }
    }
  );
};

/*
 * Load a route
 */
PhantomEngine.prototype.loadRoute = function(page, callback) {
  this.phantom.page.evaluate(function(pageUrl) {
    App.Router.router.replaceWith(pageUrl);
  }, null, page.url);

  setTimeout(_.bind(this.checkForLoad, this, page, callback), this.config.renderCheckInterval);
};

/*
 * Check for route initialization
 */
PhantomEngine.prototype.checkForLoad = function(page, callback) {
  var _this = this;

  this.phantom.page.evaluate(
    function() {
      try {
        // TODO: Improve ready checking
        if (!jQuery.active) {
          var html = document.documentElement.outerHTML.toString();
          if (document.doctype) {
            html = "<!DOCTYPE " + this.window.document.doctype.name + ">\n" + html;
          }
          return html;
        }
      } catch (e) { }

      return false;
    },
    function (result) {
      if (result !== false) {
        page.statusCode = 200;
        page.html = result;
        callback(page);
      } else {
        setTimeout(_.bind(_this.checkForLoad, _this, page, callback), _this.config.renderCheckInterval);
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
