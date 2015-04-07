var cache_manager = require('cache-manager');
var s3 = new (require('aws-sdk')).S3({params:{Bucket: process.env.S3_BUCKET_NAME}});

var cacheTTL = process.env.CACHE_TTL || 14400;

var s3_cache = {
  get: function(key, callback) {
    if (process.env.S3_PREFIX_KEY) {
      key = process.env.S3_PREFIX_KEY + '/' + key;
    }

    s3.getObject({
      Key: key
    }, callback);
  },
  set: function(key, value, callback) {
    if (process.env.S3_PREFIX_KEY) {
      key = process.env.S3_PREFIX_KEY + '/' + key;
    }

    var request = s3.putObject({
      Key: key,
      ContentType: 'text/html;charset=UTF-8',
      StorageClass: 'REDUCED_REDUNDANCY',
      Body: value
    }, callback);

    if (!callback) {
      request.send();
    }
  }
};

module.exports = {
  init: function() {
    this.cache = cache_manager.caching({
      store: s3_cache,
      ttl: cacheTTL
    });
  },

  beforeRender: function(req, res, page, next) {
    if (req.headers['x-cache-invalidate']) {
      // Skip cache
      return next();
    }
    this.cache.get(page.url, function(err, result) {
      if (!err && result) {
        page.statusCode = 200;
        page.html = result.Body;
      }
      next();
    });
  },

  beforeSend: function(req, res, page, next) {
    this.cache.set(page.url, page.html);
    next();
  }
};
