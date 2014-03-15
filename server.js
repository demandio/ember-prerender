var prerender = require('./lib');
var _ = require('lodash');

var defaultConfig = {
  port: 3000,
  renderPoolMin: 1,
  renderPoolMax: 4,
  renderPoolShrinkAfter: 30000,
  renderPoolMaxQueueSize: 5000,
  engine: 'jsdom',
  renderTimeout: 20000,
  maxRequestsPerRenderer: 250,
  baseUrl: 'http://www.your-ember-app.com/',
  assetsPath: process.env.HOME + '/public_html/',
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

if (process.env.APP) {
  config = require('./apps/' + process.env.APP)
  _.merge(defaultConfig, config);
}

var server = prerender(defaultConfig);
server.start();
