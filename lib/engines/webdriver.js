var webdriver = require('selenium-webdriver');
var chromedriver = require('chromedriver');
var path = require('path');
var _ = require('lodash');

function WebDriverEngine(config, logger) {
  this.config = config;
  this.logger = logger;

  // Currently only supporting Chrome
}

module.exports = WebDriverEngine;
