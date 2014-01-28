var prerender = require('./lib')

var server = prerender({
  port: process.env.PRERENDER_PORT || 3000,

  renderPoolMin: process.env.PRERENDER_RENDER_POOL_MIN || 1, // Min number of worker processes
  renderPoolMax: process.env.PRERENDER_RENDER_POOL_MAX || 5, // Max number of worker processes
  renderPoolShrinkAfter: process.env.PRERENDER_RENDER_POOL_SHRINK_AFTER || 300000, // Milliseconds to wait before killing idle workers
  renderPoolMaxQueueSize: process.env.PRERENDER_RENDER_POOL_MAX_QUEUE_SIZE || 10000, // Maximum number of requests to queue
  renderPoolCheckInterval: process.env.PRERENDER_RENDER_CHECK_INTERVAL || 100, // Milliseconds to wait before checking the queue for new jobs

  engine: process.env.PRERENDER_ENGINE || 'phantom', // Can be: jsdom, phantom
  renderTimeout: process.env.PRERENDER_RENDER_TIMEOUT || 20000, // Milliseconds to wait before a render job is considered a failure
  maxRequestsPerRenderer: process.env.PRERENDER_REQUESTS_PER_RENDERER || 100, // Maximum number of requests a worker can handle before restarting it

  baseUrl: process.env.PRERENDER_BASE_URL || 'http://www.stylespotter.com/', // Your app's base URL
  assetsPath: process.env.PRERENDER_ASSETS_PATH || '/Users/brian/Documents/Projects/stylespotter-web/public/', // Path to your app's files
  applicationPage: process.env.PRERENDER_APPLICATION_PAGE || 'index.html', // Main application page
  serveFiles: process.env.PRERENDER_SERVE_FILES || true, // Serve static files
  filesMatch: process.env.PRERENDER_FILES_MATCH || /\.(?:css|js|jpg|png|gif|ico|svg|woff|ttf)(?:\?|$)/, // List of static file patterns

  logging: {
    level: process.env.PRERENDER_LOG_LEVEL || 'debug', // Logging verbosity
    timestamp: process.env.PRERENDER_LOG_TIMESTAMP || true, // Add a timestamp to logs
    format: process.env.PRERENDER_LOG_FORMAT || true // Add color formatting to logs
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
