var prerender = require('./lib');
var _ = require('lodash');

// Default configuration values:
var config = {
  port: 3000,
  processNum: 0,
  engine: "phantom",
  contentReadyDelay: 0,
  initializeTimeout: 25000,
  renderTimeout: 15000,
  maxRequestsPerRenderer: 100,
  exitAfterMaxRequests: false,
  gracefulExit: true,
  maxQueueSize: 50,
  appUrl: "http://localhost:4200/",
  serveFiles: true,
  serveFilesLog: true,
  filesMatch: /\.(?:css|js|jpg|png|gif|ico|svg|woff|woff2|ttf|swf|map)(?:\?|$)/i,
  ignoreAssets: /google-analytics\.com|fonts\.googleapis\.com|typekit\.com|platform\.twitter\.com|connect\.facebook\.net|apis\.google\.com|\.css(?:\?|$)/,
  logging: {
    level: "debug",
    timestamp: true,
    format: true
  },
  plugins: [
    "removeScriptTags",
    "httpHeaders"
  ]
};

if (process.env.CONFIG) {
  var userConfig = require(process.env.CONFIG);
  _.merge(config, userConfig);
}

if (process.env.PORT) {
  config.port = process.env.PORT;
}

if (process.env.PROCESS_NUM) {
  config.processNum = parseInt(process.env.PROCESS_NUM, 10);
}

var server = prerender(config);
server.start();
