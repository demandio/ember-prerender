var prerender = require('./lib');
var _ = require('lodash');

var defaultConfig = {
  port: 3000,
  processNum: 0,
  engine: 'phantom',
  contentReadyDelay: 0,
  initializeTimeout: 25000,
  renderTimeout: 15000,
  maxRequestsPerRenderer: 100,
  maxQueueSize: 1000,
  baseUrl: 'http://localhost/',
  assetsPath: process.cwd() + '/public/',
  applicationPage: 'index.html',
  serveFiles: true,
  filesMatch: /\.(?:css|js|jpg|png|gif|ico|svg|woff|ttf|swf|map)(?:\?|$)/,
  logging: {
    level: 'debug',
    timestamp: true,
    format: true
  },
  plugins: [
    'removeScriptTags',
    'httpHeaders'
  ]
};

if (process.env.CONFIG) {
  var config = require(process.env.CONFIG);
  _.merge(defaultConfig, config);
}

if (process.env.PROCESS_NUM) {
  defaultConfig.processNum = parseInt(process.env.PROCESS_NUM, 10);
}

var server = prerender(defaultConfig);
server.start();
