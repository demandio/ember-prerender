var webdriver = require('selenium-webdriver');
var chromedriver = require('chromedriver');
var path = require('path');
var _ = require('lodash');

function WebDriverEngine(config, logger) {
  this.config = config;
  this.logger = logger;
}

/*
 * Initialize the page
 */
WebDriverEngine.prototype.init = function(appUrl, initCallback, errorCallback, beforeInitCallback) {
  var _this = this;

  this.initializationCallback = initCallback;
  this.hasInitializationCallback = true;
  this.contentReadyTimer = null;

  process.env['PATH'] = path.dirname(chromedriver.path) + ':' + process.env['PATH'];

  this.driver = new webdriver.Builder().withCapabilities(
    webdriver.Capabilities.chrome()
    //webdriver.Capabilities.firefox()
  ).build();

  beforeInitCallback(function() {
    _this.driver.get(appUrl);

    // TODO: Bind console messages, set viewport size, etc
    _this.driver.executeScript(
      "window.isPrerender = true;" +

      "window.XContentReadyFlag = false;" +
      "document.addEventListener('XContentReady', function() {" +
        "window.XContentReadyFlag = true;" +
      "}, false);" +

      "window.jsErrors = [];" +
      "window.onerror = function(errorMessage) {" +
        "window.jsErrors.push(errorMessage);" +
      "};"
    );

    // Hack: the above event listener script that sets window.XContentReadyFlag is sometimes
    //       executed after the page has already loaded
    var _maxTries = 5;
    var _checkInterval = 100;

    _this.readyTimer = setInterval(function() {
      return _this.driver.executeScript(
        "return {" +
          "ready: window.XContentReadyFlag," +
          "errors: window.jsErrors" +
        "};"
      ).then(function(result) {
        if (result.errors.length) {
          errorCallback("Phantom encountered an error: " + result.errors.join());
        } else if (result.ready || (_this.hasInitializationCallback && _maxTries <= 0)) {
          _this.driver.executeScript("window.XContentReadyFlag = false;");
          _.bind(_this.onPageReady, _this)();
        } else if (_this.hasInitializationCallback) {
          _maxTries--;
        }
      });
    }, _checkInterval);
  });
};

/*
 * Load a route
 */
WebDriverEngine.prototype.loadRoute = function(page, callback) {
  var _this = this;

  this.currentPage = page;
  this.pageCallback = callback;
  this.hasPageCallback = true;

  this.driver.executeScript(
    "window.XContentReadyFlag = false;" +
    "window.prerenderTransitionEvent.url = '" + page.url + "';" +
    "window.document.dispatchEvent(window.prerenderTransitionEvent);"
  );
};

/*
 * Callback handler for when a page finishes rendering
 */
WebDriverEngine.prototype.onPageReady = function() {
  var _this = this;

  if (this.hasInitializationCallback) {
    this.hasInitializationCallback = false;
    this.initializationCallback();
  } else {
    this.contentReadyTimer = setTimeout(function() {
      _this.driver.getPageSource().then(function(html) {
        if (_this.hasPageCallback) {
          _this.hasPageCallback = false;
          _this.currentPage.statusCode = 200;
          _this.currentPage.html = html;
          _this.pageCallback(_this.currentPage);
        }
      });
    }, this.config.contentReadyDelay);
  }
};

/*
 * Destroy the webdriver process
 */
WebDriverEngine.prototype.shutdown = function() {
  clearInterval(this.readyTimer);
  clearTimeout(this.contentReadyTimer);

  if (this.driver) {
    this.driver.quit();
  }
};

module.exports = WebDriverEngine;
