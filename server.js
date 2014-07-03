var prerender = require('./lib');
var _ = require('lodash');

// Default configuration values:
var config = {
  "port": 3000,
  "processNum": 0,
  "engine": "phantom",
  "contentReadyDelay": 0,
  "initializeTimeout": 25000,
  "renderTimeout": 15000,
  "maxRequestsPerRenderer": 100,
  "maxQueueSize": 1000,
  "baseUrl": "http://localhost:4200/",
  "applicationPage": "index.html",
  "serveFiles": true,
  "filesMatch": "/\\.(?:css|js|jpg|png|gif|ico|svg|woff|ttf|swf|map)(?:\\?|$)/i",
  "logging": {
    "level": "debug",
    "timestamp": true,
    "format": true
  },
  "plugins": [
    "removeScriptTags",
    "httpHeaders"
  ]
};

if (process.env.CONFIG) {
  var userConfig = require(process.env.CONFIG);
  _.merge(config, userConfig);
}

if (process.env.PROCESS_NUM) {
  config.processNum = parseInt(process.env.PROCESS_NUM, 10);
}

if (config.filesMatch) {
  var match = config.filesMatch.match(new RegExp("^/(.*?)/(g?i?m?y?)$"));
  if (match) {
    config.filesMatch = new RegExp(match[1], match[2]);
  } else {
    config.filesMatch = new RegExp("^$");
  }
}

var server = prerender(config);
server.start();
