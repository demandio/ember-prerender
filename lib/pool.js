var PrerenderLogger = require('./logger');
var _ = require('lodash');
var cluster = require('cluster');

function PrerenderPool(config) {
  this.config = config;
  this.logger = new PrerenderLogger(this.config.logging, 'Pool');
  this.jobs = [];
};

/*
 * Start the pool
 */
PrerenderPool.prototype.start = function() {
  this.logger.log('pool', "Starting up render pool (" + this.config.engine + ")");

  process.on('SIGUSR2', _.bind(this.restartRenderers, this));
  cluster.on('exit', _.bind(this.onRendererExit, this));

  for (var i=0; i<this.config.renderPoolMin; i++) {
    this.startRenderer();
  }
  this.queueTimer = setTimeout(_.bind(this.processQueue, this), this.config.renderPoolCheckInterval);
};

/*
 * Enqueue a rendering job
 */
PrerenderPool.prototype.enqueue = function(req, res, callback) {
  req.startTime = process.hrtime();

  if (this.jobs.length > this.config.renderPoolMaxQueueSize) {
    this.logger.log('error', "The job queue exceeded the maximum allowed size");
    req.queueDuration = 0;
    callback(req, res);
  } else {
    this.jobs.push({
      req: req,
      res: res,
      callback: callback
    });
  }
};

/*
 * Process the queue
 */
PrerenderPool.prototype.processQueue = function() {
  var totalWorkers = 0;
  var busyWorkers = 0;
  var initializingWorkers = 0;

  for (var id in cluster.workers) {
    var worker = cluster.workers[id];
    if (worker.ready) {
      if (this.jobs.length > 0) {
        worker.ready = false;
        worker.job = this.jobs.shift();
        if (!worker.job.req.connectionClosed) {
          worker.job.req.queueDuration = process.hrtime(worker.job.req.startTime);
          worker.renderTimeout = setTimeout(_.bind(this.onRenderTimeout, this, worker), this.config.renderTimeout);
          worker.send({
            event: 'render',
            url: worker.job.req.url
          });
        }
      }
    } else if (!worker.initialized) {
      initializingWorkers++;
    } else {
      busyWorkers++;
    }
    totalWorkers++;
  }

  if (initializingWorkers == 0 && this.jobs.length > 0 && totalWorkers < this.config.renderPoolMax) {
    this.logger.log('pool', "Enlarging pool to " + (totalWorkers + 1) + " renderers");
    this.startRenderer();
  } else if ((totalWorkers - busyWorkers) > 0 && totalWorkers > this.config.renderPoolMin) {
    if (!this.killTimer) {
      this.killTimer = setTimeout(_.bind(function() {
        this.logger.log('pool', "Shrinking pool to " + (totalWorkers - 1) + " renderers");
        for (var id in cluster.workers) {
          var worker = cluster.workers[id];
          if (worker.ready) {
            this.stopRenderer(worker);
            break;
          }
        }
        this.killTimer = false;
      }, this), this.config.renderPoolShrinkAfter);
    }
  } else if (this.killTimer) {
    clearTimeout(this.killTimer);
    this.killTimer = false;
  }

  this.queueTimer = setTimeout(_.bind(this.processQueue, this), this.config.renderPoolCheckInterval);
};

/*
 * Handle communication from the worker processes
 */
PrerenderPool.prototype.onWorkerMessage = function(worker, msg) {
  switch (msg.event) {
    case 'initialized':
      clearTimeout(worker.initializeTimeout);
      var duration = this.hrtimeToMs(process.hrtime(worker.startTime));
      this.logger.log('pool', "Renderer " + worker.id + " initialized after " + duration + "ms");
      worker.initialized = true;
      worker.ready = true;
      break;
    case 'finished':
      clearTimeout(worker.renderTimeout);
      worker.job.res.page = msg.page;
      worker.job.callback(worker.job.req, worker.job.res);
      worker.job = false;
      worker.ready = true;

      if (worker.numRequests >= this.config.maxRequestsPerRenderer) {
        this.logger.log('pool', "Renderer " + worker.id + " reached the maximum allowed number of requests, starting a new renderer");
        this.stopRenderer(worker);
        this.startRenderer();
      } else {
        worker.numRequests++;
      }
      break;
  }
};

/*
 * Handle worker initialization timeouts
 */
PrerenderPool.prototype.onInitializeTimeout = function(worker) {
  this.logger.log('error', "Restarting renderer " + worker.id + ", timed out while initializing");
  this.stopRenderer(worker);
  this.startRenderer();
}

/*
 * Handle worker rendering timeouts
 */
PrerenderPool.prototype.onRenderTimeout = function(worker) {
  this.logger.log('error', "Restarting renderer " + worker.id + ", timed out while rendering: " + worker.job.req.url);
  this.stopRenderer(worker);
  this.startRenderer();
}

/*
 * Handle abnormal worker exits
 */
PrerenderPool.prototype.onRendererExit = function(worker, code, signal) {
  if (worker.job) {
    clearTimeout(worker.renderTimeout);
    worker.job.callback(worker.job.req, worker.job.res);
  }
  this.logger.log('pool', "Worker " + worker.id + " exited");
  if (code != 0) {
    this.startRenderer();
  }
};

/*
 * Start a renderer
 */
PrerenderPool.prototype.startRenderer = function() {
  var worker = cluster.fork();
  worker.ready = false;
  worker.initialized = false;
  worker.numRequests = 0;
  worker.startTime = process.hrtime();
  worker.initializeTimeout = setTimeout(_.bind(this.onInitializeTimeout, this, worker), this.config.renderTimeout);
  worker.on('message', _.bind(this.onWorkerMessage, this, worker));
};

/*
 * Stop a worker
 */
PrerenderPool.prototype.stopRenderer = function(worker) {
  worker.ready = false;
  if (worker.job) {
    worker.job.callback(worker.job.req, worker.job.res);
  }
  worker.send({
    event: 'shutdown',
    restart: false
  });
};

/*
 * Restart the workers
 */
PrerenderPool.prototype.restartRenderers = function() {
  this.logger.log('pool', "Reload signal received, restarting workers");
  for (var id in cluster.workers) {
    cluster.workers[id].send({
      event: 'shutdown',
      restart: true
    });
  }
};

/*
 * Convert hrtime to milliseconds
 */
PrerenderPool.prototype.hrtimeToMs = function(hr) {
  return (hr[0] * 1000 + parseInt(hr[1] / 1000000));
};

module.exports = PrerenderPool;
