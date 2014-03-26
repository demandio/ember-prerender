module.exports = {
  port: 3000,  // The port that prerender runs on (Phantom will use additional ports)
  phantomPort: 30000,  // The port that PhantomJS uses (if using the phantom engine)

  engine: 'phantom',            // Can be: jsdom, phantom
  renderTimeout: 20000,         // Milliseconds to wait before a render job is considered a failure
  maxRequestsPerRenderer: 200,  // Maximum number of requests a worker can handle before it's restarted

  baseUrl: 'http://localhost/',                                           // Your app's base URL
  assetsPath: process.env.HOME + '/Documents/Projects/ember-app/public/', // Path to your app's files
  applicationPage: 'index.html',                                          // Main application page
  serveFiles: true,                                                       // Serve static files
  filesMatch: /\.(?:css|js|jpg|png|gif|ico|svg|woff|ttf|swf)(?:\?|$)/,    // List of static file patterns

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
