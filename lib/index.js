var PrerenderServer = require('./server');

exports = module.exports = function(config) {
  return new PrerenderServer(config);
};
