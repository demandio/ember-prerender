var cache_manager = require('cache-manager');
var MongoClient = require('mongodb').MongoClient;

var mongoURI = process.env.MONGO_URI || 'mongodb://localhost/ember-prerender';
var cacheTTL = process.env.CACHE_TTL || 14400;

var db, pages;

MongoClient.connect(mongoURI, function(err, database) {
  db = database;
  database.collection('pages', function(err, collection) {
    pages = collection;
  });
  //pages.ensureIndex({ createdOn: 1 }, { expireAfterSeconds: mongoTTL });
});

var mongo_cache = {
  get: function(key, callback) {
    pages.findOne({ key: key }, callback);
  },
  set: function(key, value, callback) {
    var object = {
      key: key,
      value: value,
      createdOn: new Date()
    };
    pages.update({ key: key }, object, { upsert: true }, function (err) {
      // Ignored
    });
  }
};

module.exports = {
  init: function() {
    this.cache = cache_manager.caching({
      store: mongo_cache,
      ttl: cacheTTL
    });
  },

  beforeRender: function(req, res, page, next) {
    if (req.method !== 'GET') {
      // Skip cache for POST/PUT requests
      return next();
    }
    this.cache.get(page.url, function(err, result) {
      if (!err && result && result.value) {
        page.statusCode = 200;
        page.html = result.value;
      }
      next();
    });
  },

  beforeSend: function(req, res, page, next) {
    this.cache.set(page.url, page.html);
    next();
  }
};
