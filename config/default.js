module.exports = {
  port: 3000,     // The port that prerender runs on (Phantom will use additional ports)
  processNum: 0,  // Process number (starting from 0) which is added to the above port, used when running multiple instances

  engine: 'phantom',        // Can be: jsdom, phantom

  contentReadyDelay: 0,         // Milliseconds to wait after the page load but before getting the HTML
  initializeTimeout: 25000,     // Maximum milliseconds to wait before the initial app load times out
  renderTimeout: 15000,         // Maximum milliseconds to wait before a render job times out
  maxRequestsPerRenderer: 200,  // Maximum number of requests a worker can handle before it's restarted
  maxQueueSize: 1000,           // Maximum number of rendering requests to queue up before dropping new ones

  baseUrl: 'http://localhost/',                                           // Your app's base URL
  assetsPath: process.env.HOME + '/Documents/Projects/ember-app/public/', // Path to your app's files
  applicationPage: 'index.html',                                          // Main application page
  serveFiles: true,                                                       // Serve static files
  filesMatch: /\.(?:css|js|jpg|png|gif|ico|svg|woff|ttf|swf|map)(?:\?|$)/,// List of static file patterns

  logging: {
    level: 'debug',   // Logging verbosity
    timestamp: true,  // Add a timestamp to logs
    format: true      // Add color formatting to logs
  },

  plugins: [
    'removeScriptTags',
    'httpHeaders',
    //'prepareEmail',
    //'prettyPrintHtml',
    //'inMemoryHtmlCache',
    //'s3HtmlCache',
  ]
};
