var cache_manager = require('cache-manager');

module.exports = {
  init: function() {
    this.cache = cache_manager.caching({
      store: 'memory', max: 100, ttl: 60/*seconds*/
    });
  },

  beforeRender: function(req, res, page, next) {
    this.cache.get(page.url, function(err, result) {
      if (!err && result) {
        page.statusCode = 200;
        page.html = result;
      } else {
        next();
      }
    });
  },

  beforeSend: function(req, res, page, next) {
    this.cache.set(page.url, page.html);
    next();
  }
};
