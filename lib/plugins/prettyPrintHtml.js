var pretty = require('pretty');

module.exports = {
  beforeSend: function(req, res, page, next) {
    if (!page.html) {
      return next();
    }
    page.html = pretty(page.html);
    next();
  }
};
