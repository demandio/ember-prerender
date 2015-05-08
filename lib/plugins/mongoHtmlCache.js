var MongoClient = require('mongodb').MongoClient;

var mongoURI = process.env.MONGO_URI || 'mongodb://localhost/ember-prerender';
var mongoCollection = process.env.MONGO_COLL || 'pages';
var cacheTTL = process.env.CACHE_TTL || 14400;

var collection;

MongoClient.connect(mongoURI, function(err, db) {
  if (db) {
    db.collection(mongoCollection, function(err, coll) {
      collection = coll;

      // Currently keeping records in mongo indefinitely and checking the date delta in beforeRender,
      // an alternative option is to have Mongo expire the record automatically
      //collection.ensureIndex({ createdOn: 1 }, { expireAfterSeconds: cacheTTL });
    });
 }
});

module.exports = {
  beforeRender: function(req, res, page, next) {
    if (req.headers['x-cache-invalidate'] || !collection) {
      // Skip cache for POST/PUT requests or if no DB collection is available
      return next();
    }
    collection.findOne({ url: page.url }, function(err, result) {
      if (!err && result && result.html) {
        if (((new Date() - result.ts) / 1000) <= cacheTTL) {
          page.statusCode = result.status || 200;
          if ((page.statusCode === 301 || page.statusCode === 302) && result.location) {
            res.setHeader('Location', result.location);
          }
          page.html = result.html;
        }
      }
      next();
    });
  },

  beforeSend: function(req, res, page, next) {
    if (page.statusCode < 400) {
      var object = {
        url: page.url,
        status: page.statusCode,
        html: page.html,
        ts: new Date()
      };
      if (page.statusCode === 301 || page.statusCode === 302) {
        var location = res.getHeader('Location');
        if (location) {
          object.location = location;
        }
      }
      collection.update({ url: object.url }, object, { upsert: true }, function (err) {
        // Ignored
      });
    }
    next();
  }
};
