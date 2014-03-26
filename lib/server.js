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
  this.renderer.start = startRenderer(_.bind(this.afterRendererInit, this));
};

/*
 * Start the server after the renderer has initialized the rendering engine
 */
PrerenderServer.prototype.afterRendererInit = function(err) {
  if (err) {
    this.logger.log('error', "Renderer initialization failed");
    process.exit(1);
  } else {
    this.logger.log('server', "Server listening on port " + this.config.port);
    this.server = http.createServer(_.bind(this.onRequest, this)).listen(this.config.port);
    process.on('SIGUSR2', _.bind(this.restartRenderer, this));
  }
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
    this.logger.log('server', this.job.user + " -> Received an unsupported " + this.job.req.method + " request: " + this.job.url);
    this.job.res.writeHead(405, {'Content-Type': 'text/html;charset=UTF-8'});
    this.job.res.end("405 Method Not Allowed");
  } else if (this.job.url.match(this.config.filesMatch)) {
    if (this.config.serveFiles) {
      this.logger.log('server', this.job.user + " -> Serving file: " + this.job.url);
      _.bind(this.serveFile, this)(this.job.req, this.job.res);
    } else {
      this.job.res.writeHead(503, {'Content-Type': 'text/html;charset=UTF-8'});
      this.job.res.end("503 Service Unvailable");
    }
  } else {
    this.logger.log('server', this.job.user + " -> Rendering route: " + this.job.url);
    this.job.req.queueDuration = process.hrtime(this.job.req.startTime);
    this.renderTimer = setTimeout(_.bind(this.onRenderTimeout, this), this.config.renderTimeout);
    this.renderer.renderPage(this.job.page);
  }
};

/*
 * Send the rendered page
 */
PrerenderServer.prototype.sendPage = function() {
  if (!this.job.res.sent) {
    var totalDuration = this.hrtimeToMs(process.hrtime(this.job.req.startTime));

    this.logger.log('server', this.job.user + " -> Rendered page in " + totalDuration + "ms " +
                    "with status code " + this.job.res.statusCode + ": " + this.job.url);

    this.job.res.setHeader('Content-Length', Buffer.byteLength(page.html, 'utf8'));
    this.job.res.writeHead(page.statusCode, {'Content-Type': 'text/html;charset=UTF-8'});
    this.job.res.end(page.html);
    this.job.res.sent = true;
  }
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
 * Serve a static file
 */
PrerenderServer.prototype.serveFile = function() {
  var file = this.config.assetsPath + this.job.url.replace('../', '');
  fs.exists(file, function(exists) {
    if (exists) {
      fs.readFile(file, function(err, data) {
        if (err) {
          this.job.res.writeHead(503, {'Content-Type': 'text/html;charset=UTF-8'});
          this.job.res.end("503 Service Unvailable");
        } else {
          this.job.res.writeHead(200, {'Content-Type': mime.lookup(file)});
          this.job.res.end(data, 'binary');
        }
      });
    } else {
      this.job.res.writeHead(404, {'Content-Type': 'text/html;charset=UTF-8'});
      this.job.res.end("404 File Not Found");
    }
  });
};

/*
 * Renderer finished
 */
PrerenderServer.prototype.onRendererFinished = function() {
  clearTimeout(this.renderTimer);
  this.job.callback(this.job.req, this.job.res);
  this.job = null;
};

/*
 * Convert hrtime to milliseconds
 */
PrerenderServer.prototype.hrtimeToMs = function(hr) {
  return (hr[0] * 1000 + parseInt(hr[1] / 1000000));
};

module.exports = PrerenderServer;
