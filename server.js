var prerender = require('./lib');
var _ = require('lodash');

var defaultConfig = {
  port: 3000,
  phantomPort: 30000,
  engine: 'jsdom',
  renderTimeout: 20000,
  maxRequestsPerRenderer: 100,
  baseUrl: 'http://localhost/',
  assetsPath: process.cwd() + '/public/',
  applicationPage: 'index.html',
  serveFiles: true,
  filesMatch: /\.(?:css|js|jpg|png|gif|ico|svg|woff|ttf|swf)(?:\?|$)/,
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
  config = require(process.env.CONFIG)
  _.merge(defaultConfig, config);
}

var server = prerender(defaultConfig);
server.start();
