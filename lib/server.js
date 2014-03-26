var PrerenderLogger = require('./logger');
var PrerenderRenderer = require('./renderer');
var _ = require('lodash');
var http = require('http');
var url = require('url');
var fs = require('fs');
var mime = require('mime');

function PrerenderServer(config) {
  this.config = config;
  this.logger = new PrerenderLogger(this.config.logging, 'Server');
  this.renderer = new PrerenderRenderer(this.config);
};

/*
 * Start the renderer and server
 */
PrerenderServer.prototype.start = function() {
  this.logger.log('server', "Starting renderer");
  this.renderer.start(_.bind(this.afterRendererInit, this));
};

/*
 * Start the server after the renderer has initialized the rendering engine
 */
PrerenderServer.prototype.afterRendererInit = function(err) {
  this.logger.log('server', "Server listening on port " + this.config.port);
  this.server = http.createServer(_.bind(this.onRequest, this)).listen(this.config.port);
}

/*
 * Handle a server request
 */
PrerenderServer.prototype.onRequest = function(req, res) {
  var addr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  var agent = req.headers['user-agent'] || "Unknown";

  this.job = {
    req: req,
    res: res,
    startTime: process.hrtime(),
    user: addr + ' (' + agent + ')',
    page: {
      url: this.parseURL(req.url),
      statusCode: 503, // Default code in the event of a rendering error
      html: "503 Service Unavailable"
    },
    callback: _.bind(this.sendPage, this)
  };

  if (this.job.req.method != 'GET') {
    // Not a valid request method
    this.logger.log('server', this.job.user + " -> Received an unsupported " + this.job.req.method + " request: " + this.job.page.url);
    this.job.res.writeHead(405, {'Content-Type': 'text/html;charset=UTF-8'});
    this.job.res.end("405 Method Not Allowed");
  } else if (this.job.page.url.match(this.config.filesMatch)) {
    // Serve a static file
    if (this.config.serveFiles) {
      this.logger.log('server', this.job.user + " -> Serving file: " + this.job.page.url);
      _.bind(this.serveFile, this)();
    } else {
      this.job.res.writeHead(503, {'Content-Type': 'text/html;charset=UTF-8'});
      this.job.res.end("503 Service Unvailable");
    }
  } else {
    // Render a route
    this.logger.log('server', this.job.user + " -> Rendering route: " + this.job.page.url);
    this.renderer.renderPage(this.job);
  }
};

/*
 * Send the rendered page
 */
PrerenderServer.prototype.sendPage = function(page) {
  if (!this.job.res.sent) {
    var totalDuration = this.hrtimeToMs(process.hrtime(this.job.startTime));
    this.logger.log('server', this.job.user + " -> Rendered page in " + totalDuration + "ms " +
                    "with status code " + this.job.res.statusCode + ": " + this.job.page.url);

    this.job.res.setHeader('Content-Length', Buffer.byteLength(page.html, 'utf8'));
    this.job.res.writeHead(page.statusCode, {'Content-Type': 'text/html;charset=UTF-8'});
    this.job.res.end(page.html);
    this.job.res.sent = true;
  }
  this.job = null;
};

/*
 * Serve a static file
 */
PrerenderServer.prototype.serveFile = function() {
  var file = this.config.assetsPath + url.parse(this.job.page.url).pathname.replace('../', '');
  fs.exists(file, _.bind(function(exists) {
    if (exists) {
      fs.readFile(file, _.bind(function(err, data) {
        if (err) {
          this.job.res.writeHead(503, {'Content-Type': 'text/html;charset=UTF-8'});
          this.job.res.end("503 Service Unvailable");
        } else {
          this.job.res.writeHead(200, {'Content-Type': mime.lookup(file)});
          this.job.res.end(data, 'binary');
        }
      }, this));
    } else {
      this.job.res.writeHead(404, {'Content-Type': 'text/html;charset=UTF-8'});
      this.job.res.end("404 File Not Found");
    }
  }, this));
};

/*
 * Parse the full url into the path and query string
 */
PrerenderServer.prototype.parseURL = function(reqURL) {
  var parts = url.parse(reqURL, true);
  if (parts.query['_escaped_fragment_']) {
    parts.hash = '#!' + parts.query['_escaped_fragment_'];
    delete parts.query['_escaped_fragment_'];
    delete parts.search;
  }
  return url.format(parts);
};

/*
 * Convert hrtime to milliseconds
 */
PrerenderServer.prototype.hrtimeToMs = function(hr) {
  return (hr[0] * 1000 + parseInt(hr[1] / 1000000));
};

module.exports = PrerenderServer;
