var prerender = require('./lib')

var server = prerender({
  port: process.env.PRERENDER_PORT || 3000,

  renderPoolMin: process.env.PRERENDER_RENDER_POOL_MIN || 1,
  renderPoolMax: process.env.PRERENDER_RENDER_POOL_MAX || 5,
  renderPoolShrinkAfter: process.env.PRERENDER_RENDER_POOL_SHRINK_AFTER || 300000,
  renderPoolMaxQueueSize: process.env.PRERENDER_RENDER_POOL_MAX_QUEUE_SIZE || 500,
  renderPoolCheckInterval: process.env.PRERENDER_RENDER_CHECK_INTERVAL || 100,

  engine: process.env.PRERENDER_ENGINE || 'jsdom', // Can be: jsdom, phantom
  renderTimeout: process.env.PRERENDER_RENDER_TIMEOUT || 20000,
  renderCheckInterval: process.env.PRERENDER_CHECK_INTERVAL || 100,
  maxRequestsPerRenderer: process.env.PRERENDER_REQUESTS_PER_RENDERER || 100,

  baseUrl: process.env.PRERENDER_BASE_URL || 'http://www.stylespotter.com/',
  assetsPath: process.env.PRERENDER_ASSETS_PATH || '/Users/brian/Documents/Projects/stylespotter-web/public/',
  applicationPage: process.env.PRERENDER_APPLICATION_PAGE || 'index.html',
  serveFiles: process.env.PRERENDER_SERVE_FILES || true,
  filesMatch: process.env.PRERENDER_FILES_MATCH || /\.(css|js|jpg|png|gif|ico|svg|woff|ttf)$/,

  logging: {
    level: process.env.PRERENDER_LOG_LEVEL || 'warn',
    timestamp: process.env.PRERENDER_LOG_TIMESTAMP || true,
    format: process.env.PRERENDER_LOG_FORMAT || true
  },

  plugins: [
    'removeScriptTags',
    'httpHeaders',
    'prepareEmail',
    //'prettyPrintHtml',
    //'inMemoryHtmlCache',
    //'s3HtmlCache',
  ]
});

server.start();
