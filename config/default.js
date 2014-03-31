module.exports = {
  port: 3000,               // The port that prerender runs on (Phantom will use additional ports)
  phantomPortStart: 30000,  // The starting port range for the PhantomJS bridge to use (an available port in the range will be used)
  phantomPortEnd: 40000,    // The ending port range for the PhantomJS bridge to use
  processNum: 0,            // Process number (starting from 0) which is added to the above ports, used when running multiple instances

  engine: 'phantom',            // Can be: jsdom, phantom
  initializeTimeout: 25000,     // Milliseconds to wait for the initial app load
  renderTimeout: 15000,         // Milliseconds to wait before a render job is considered a failure
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
