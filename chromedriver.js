var webdriver = require('selenium-webdriver');
var chromedriver = require('chromedriver');
var path = require('path');

process.env['PATH'] = path.dirname(chromedriver.path) + ':' + process.env['PATH'];

var driver = new webdriver.Builder().withCapabilities(
  webdriver.Capabilities.chrome()
  //webdriver.Capabilities.firefox()
).build();

var baseUrl = 'http://bluepromocode.com/';
var merchantPath = 'pandaexpress/';

driver.get(baseUrl);

var listener = "window.isPrerender = true;" +
               "document.addEventListener('XContentReady', function() {" +
                 "window.XContentReadyFlag = true;" +
               "}, false);"

var loader = "window.XContentReadyFlag = false;" +
             "window.prerenderTransitionEvent.url = '" + merchantPath + "';" +
             "window.dispatchEvent(window.prerenderTransitionEvent);" +
             "console.log('test');"

var checker = "return window.XContentReadyFlag;";

// TODO: Bind console messages

driver.executeScript(listener);
driver.wait(function() {
  return driver.executeScript(checker).then(function(value) {
    console.log("Executed: ", value);
    driver.getPageSource().then(function(html) {
      console.log(html.length);
    });
    return value;
  });
}, 1000);

driver.executeScript(loader);
driver.wait(function() {
  return driver.executeScript(checker).then(function(value) {
    console.log("Loaded: ", value);
    driver.getPageSource().then(function(html) {
      console.log(html.length);
    });
    return value;
  });
}, 1000);

driver.quit();

