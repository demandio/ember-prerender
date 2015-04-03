var request = require('request');

module.exports = {
  beforeSend: function(req, res, page, next) {
    if (page.url.indexOf('_escaped_fragment_=') < 0 &&
        page.url.indexOf('prerender=1') < 0 &&
        page.statusCode === 200) {
      var domain = req.headers.host;
      request('https://' + domain, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          page.html = body;
        }
        next();
      })
    } else {
      next();
    }
  }
};
