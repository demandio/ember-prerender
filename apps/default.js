module.exports = {
  port: 3000,  // The port that prerender runs on (Phantom will use additional ports)

  renderPoolMin: 1,             // Min number of worker processes
  renderPoolMax: 2,             // Max number of worker processes
  renderPoolShrinkAfter: 30000, // Milliseconds to wait before killing idle workers
  renderPoolMaxQueueSize: 5000, // Maximum number of requests to queue

  engine: 'phantom',            // Can be: jsdom, phantom
  renderTimeout: 20000,         // Milliseconds to wait before a render job is considered a failure
  maxRequestsPerRenderer: 250,  // Maximum number of requests a worker can handle before it's restarted

  baseUrl: 'http://localhost/',                                        // Your app's base URL
  assetsPath: process.env.HOME + 'Documents/Projects/ember-app',       // Path to your app's files
  applicationPage: 'index.html',                                       // Main application page
  serveFiles: true,                                                    // Serve static files
  filesMatch: /\.(?:css|js|jpg|png|gif|ico|svg|woff|ttf|swf)(?:\?|$)/, // List of static file patterns

  logging: {
    level: 'debug',    // Logging verbosity
    timestamp: true,   // Add a timestamp to logs
    format: true       // Add color formatting to logs
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
