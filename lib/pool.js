var PrerenderLogger = require('./logger');
var _ = require('lodash');
var cluster = require('cluster');

function PrerenderPool(config) {
  this.config = config;
  this.logger = new PrerenderLogger(this.config.logging, 'Pool');
  this.numWorkers = 0;
  this.availableWorkers = [];
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
};

/*
 * Enqueue a rendering job
 */
PrerenderPool.prototype.enqueue = function(req, res, callback) {
  req.startTime = process.hrtime();

  var job = {
    req: req,
    res: res,
    callback: callback
  };

  if (this.availableWorkers.length) {
    if (this.shrinkTimer && this.availableWorkers.length == 1) {
      clearTimeout(this.shrinkTimer);
      this.shrinkTimer = false;
    }
    var worker = this.availableWorkers.pop();
    this.startJob(worker, job);
  } else if (this.jobs.length >= this.config.renderPoolMaxQueueSize) {
    this.logger.log('error', "The job queue exceeded the maximum allowed size");
    req.queueDuration = process.hrtime(req.startTime);
    callback(req, res);
  } else {
    if (this.shrinkTimer) {
      clearTimeout(this.shrinkTimer);
      this.shrinkTimer = false;
    }
    if (this.numWorkers < this.config.renderPoolMax) {
      this.logger.log('pool', "Enlarging pool to " + (this.numWorkers + 1) + " renderers");
      this.startRenderer();
    }
    this.jobs.unshift(job);
  }
};

/*
 * Start a job
 */
PrerenderPool.prototype.startJob = function(worker, job) {
  if (job.req.connectionClosed) {
    this.logger.log('error', "Client closed connection before request was served");
    this.checkForJobs(worker);
  } else {
    job.req.queueDuration = process.hrtime(job.req.startTime);
    worker.job = job;
    worker.renderTimeout = setTimeout(_.bind(this.onRenderTimeout, this, worker), this.config.renderTimeout);
    worker.send({
      event: 'render',
      page: job.res.page
    });
  }
};

/*
 * Check for queued jobs
 */
PrerenderPool.prototype.checkForJobs = function(worker) {
  if (this.jobs.length) {
    if (this.shrinkTimer && this.jobs.length > 1) {
      clearTimeout(this.shrinkTimer);
      this.shrinkTimer = false;
    }
    var job = this.jobs.pop();
    this.startJob(worker, job);
  } else {
    if (!this.shrinkTimer && this.numWorkers > this.config.renderPoolMin) {
      this.shrinkTimer = setTimeout(_.bind(function() {
        if (this.availableWorkers.length) {
          this.logger.log('pool', "Shrinking pool to " + (this.numWorkers - 1) + " renderers");
          var worker = this.availableWorkers.pop();
          this.stopRenderer(worker);
        }
      }, this), this.config.renderPoolShrinkAfter);
    }
    this.availableWorkers.unshift(worker);
  }
}

/*
 * Handle communication from the worker processes
 */
PrerenderPool.prototype.onWorkerMessage = function(worker, msg) {
  switch (msg.event) {
    case 'initialized':
      clearTimeout(worker.initializeTimeout);
      var duration = this.hrtimeToMs(process.hrtime(worker.startTime));
      this.logger.log('pool', "Renderer " + worker.id + " initialized after " + duration + "ms");
      this.checkForJobs(worker);
      break;
    case 'finished':
      clearTimeout(worker.renderTimeout);
      worker.job.res.page = msg.page;
      worker.job.callback(worker.job.req, worker.job.res);
      worker.job = false;
      if (worker.numRequests >= this.config.maxRequestsPerRenderer) {
        this.logger.log('pool', "Renderer " + worker.id + " reached the maximum allowed number of requests, starting a new renderer");
        this.stopRenderer(worker);
        this.startRenderer();
      } else {
        worker.numRequests++;
        this.checkForJobs(worker);
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
    worker.job = false;
  }
  this.logger.log('pool', "Worker " + worker.id + " exited");
  this.numWorkers--;

  if (code == 1) {
    this.startRenderer();
  } else if (code > 1) {
    this.logger.log('error', "Worker " + worker.id + " exited with unknown error code:", signal || code);
    process.exit(2);
  }
};

/*
 * Start a renderer
 */
PrerenderPool.prototype.startRenderer = function() {
  var worker = cluster.fork();
  worker.numRequests = 0;
  worker.startTime = process.hrtime();
  worker.initializeTimeout = setTimeout(_.bind(this.onInitializeTimeout, this, worker), this.config.renderTimeout);
  worker.on('message', _.bind(this.onWorkerMessage, this, worker));
  this.numWorkers++;
};

/*
 * Stop a worker
 */
PrerenderPool.prototype.stopRenderer = function(worker) {
  var index = this.availableWorkers.indexOf(worker);
  this.availableWorkers.splice(index, 1);

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
