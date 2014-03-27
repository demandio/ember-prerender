var PrerenderLogger = require('./logger');
var PrerenderRenderer = require('./renderer');
var _ = require('lodash');
var http = require('http');
var url = require('url');
var fs = require('fs');
var mime = require('mime');

function PrerenderServer(config) {
  this.config = config;
  this.logger = new PrerenderLogger(this.config.logging, 'Server ' + this.config.processNum);
  this.renderer = new PrerenderRenderer(this.config);
  this.queue = [];
};

/*
 * Start the renderer and server
 */
PrerenderServer.prototype.start = function() {
  this.logger.log('server', "Server listening on port " + (this.config.port + this.config.processNum));
  this.server = http.createServer(_.bind(this.onRequest, this)).listen((this.config.port + this.config.processNum));

  this.logger.log('server', "Starting renderer");
  this.renderer.start(_.bind(this.afterRendererInit, this));
};

/*
 * Check the queue after the renderer finishes initializing
 */
PrerenderServer.prototype.afterRendererInit = function() {
  this.processQueue();
};

/*
 * Handle a server request
 */
PrerenderServer.prototype.onRequest = function(req, res) {
  var addr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  var agent = req.headers['user-agent'] || "Unknown";
  var user = addr + ' (' + agent + ')';
  var reqUrl = this.parseURL(req.url);

  if (req.method != 'GET') {
    // Not a valid request method
    this.logger.log('error', user + " -> Received an unsupported " + req.method + " request: " + reqUrl);
    res.writeHead(405, {'Content-Type': 'text/html;charset=UTF-8'});
    res.end("405 Method Not Allowed");
  } else if (reqUrl.match(this.config.filesMatch)) {
    // Serve a static file
    if (this.config.serveFiles) {
      this.logger.log('server', user + " -> Serving file: " + reqUrl);
      _.bind(this.serveFile, this)(req, res, reqUrl);
    } else {
      res.writeHead(503, {'Content-Type': 'text/html;charset=UTF-8'});
      res.end("503 Service Unvailable");
    }
  } else {
    // Enqueue a rendering job
    if (this.queue.length > this.config.maxQueueSize) {
      this.logger.log('error', user + " -> Request failed, queue reached the maximum configured size: " + reqUrl);
      res.writeHead(503, {'Content-Type': 'text/html;charset=UTF-8'});
      res.end("503 Service Unvailable");
    } else {
      this.logger.log('server', user + " -> Enqueueing route: " + reqUrl);
      var job = {
        req: req,
        res: res,
        queueTime: process.hrtime(),
        user: user,
        page: {
          url: reqUrl,
          statusCode: 503, // Default code in the event of a rendering error
          html: "503 Service Unavailable"
        },
        callback: _.bind(this.sendPage, this)
      };
      this.queue.push(job);
      this.processQueue();
    }
  }
};

/*
 * Process any jobs in the queue
 */
PrerenderServer.prototype.processQueue = function() {
  if (!this.renderer.busy && this.queue.length > 0) {
    var job = this.queue.shift();
    job.startTime = process.hrtime();
    this.logger.log('server', job.user + " -> Rendering route: " + job.page.url);
    this.renderer.renderPage(job);
  }
};

/*
 * Send the rendered page
 */
PrerenderServer.prototype.sendPage = function(job) {
  var totalDuration = this.hrtimeToMs(process.hrtime(job.queueTime));
  var renderDuration = this.hrtimeToMs(process.hrtime(job.startTime));
  var queueDuration = parseInt(totalDuration - renderDuration);

  this.logger.log('server', job.user + " -> Rendered page in " + totalDuration + "ms " +
                  "(" + queueDuration + "ms in queue + " + renderDuration + "ms rendering) " +
                  "with status code " + job.res.statusCode + ": " + job.page.url);

  job.res.setHeader('Content-Length', Buffer.byteLength(job.page.html, 'utf8'));
  job.res.writeHead(job.page.statusCode, {'Content-Type': 'text/html;charset=UTF-8'});
  job.res.end(job.page.html);

  this.processQueue();
};

/*
 * Serve a static file
 */
PrerenderServer.prototype.serveFile = function(req, res, reqUrl) {
  var file = this.config.assetsPath + url.parse(reqUrl).pathname.replace('../', '');
  fs.exists(file, function(exists) {
    if (exists) {
      fs.readFile(file, function(err, data) {
        if (err) {
          res.writeHead(503, {'Content-Type': 'text/html;charset=UTF-8'});
          res.end("503 Service Unvailable");
        } else {
          res.writeHead(200, {'Content-Type': mime.lookup(file)});
          res.end(data, 'binary');
        }
      });
    } else {
      res.writeHead(404, {'Content-Type': 'text/html;charset=UTF-8'});
      res.end("404 File Not Found");
    }
  });
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
