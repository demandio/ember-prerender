var PrerenderServer = require('./server');
var PrerenderRenderer = require('./renderer');
var cluster = require('cluster');



exports = module.exports = function(config) {
  if (cluster.isMaster) {
    return new PrerenderServer(config);
  } else if (cluster.isWorker) {
    return new PrerenderRenderer(config);
  }
};
