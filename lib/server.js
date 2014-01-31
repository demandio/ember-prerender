var PrerenderLogger = require('./logger');
var PrerenderPool = require('./pool');
var _ = require('lodash');
var http = require('http');
var url = require('url');
var fs = require('fs');
var mime = require('mime');

function PrerenderServer(config) {
  this.config = config;
  this.logger = new PrerenderLogger(this.config.logging, 'Server');
  this.pool = new PrerenderPool(this.config);
};

/*
 * Start the server
 */
PrerenderServer.prototype.start = function() {
  this.server = http.createServer(_.bind(this.onRequest, this)).listen(this.config.port);
  this.logger.log('server', "Server listening on port " + this.config.port);
  this.pool.start();
};

/*
 * Handle a server request
 */
PrerenderServer.prototype.onRequest = function(req, res) {
  var addr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  var agent = req.headers['user-agent'] || "Unknown";

  req.user = addr + ' (' + agent + ')';
  req.url = this.getURL(req.url);

  if (req.method != 'GET') {
    this.logger.log('server', req.user + " -> Received an unsupported " + req.method + " request: " + req.url);
    res.writeHead(405, {'Content-Type': 'text/html;charset=UTF-8'});
    res.end("405 Method Not Allowed");
  } else if (req.url.match(this.config.filesMatch)) {
    if (this.config.serveFiles) {
      this.logger.log('server', req.user + " -> Serving file: " + req.url);
      _.bind(this.serveFile, this)(req, res);
    } else {
      res.writeHead(503, {'Content-Type': 'text/html;charset=UTF-8'});
      res.end("503 Service Unvailable");
    }
  } else {
    this.logger.log('server', req.user + " -> Enqueueing route: " + req.url);
    req.on("close", function(err) {
      req.connectionClosed = true;
    });
    res.page = {
      url: req.url,
      statusCode: 503,
      html: "503 Service Unavailable"
    };
    this.pool.enqueue(req, res, _.bind(this.sendPage, this));
  }
};

/*
 * Send the rendered page
 */
PrerenderServer.prototype.sendPage = function(req, res) {
  if (!res.sent) {
    var totalDuration = this.hrtimeToMs(process.hrtime(req.startTime));
    var queueDuration = this.hrtimeToMs(req.queueDuration);
    var renderDuration = (totalDuration - queueDuration);

    this.logger.log('server', req.user + " -> Rendered page in " + totalDuration + "ms " +
                    "(" + queueDuration + "ms waiting + " + renderDuration + "ms rendering) with " +
                    "status code " + res.statusCode + ": " + req.url);

    res.setHeader('Content-Length', Buffer.byteLength(res.page.html, 'utf8'));
    res.writeHead(res.page.statusCode, {'Content-Type': 'text/html;charset=UTF-8'});
    res.end(res.page.html);
    res.sent = true;
  }
};

/*
 * Parse the full url into the path and query string
 */
PrerenderServer.prototype.getURL = function(reqURL) {
  var parts = url.parse(reqURL, true);
  if (parts.query['_escaped_fragment_']) {
    parts.hash = '#!' + parts.query['_escaped_fragment_'];
    delete parts.query['_escaped_fragment_'];
    delete parts.search;
  }
  return url.format(parts);
}

/*
 * Serve a static file
 */
PrerenderServer.prototype.serveFile = function(req, res) {
  var file = this.config.assetsPath + req.url.replace('../', '');
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
 * Convert hrtime to milliseconds
 */
PrerenderServer.prototype.hrtimeToMs = function(hr) {
  return (hr[0] * 1000 + parseInt(hr[1] / 1000000));
};

module.exports = PrerenderServer;
