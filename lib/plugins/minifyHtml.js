var Minimize = require('minimize');
var minimize = new Minimize({
  empty: false,       // KEEP empty attributes
  cdata: true,        // KEEP CDATA from scripts
  comments: false,    // KEEP comments
  ssi: false,         // KEEP Server Side Includes
  conditionals: true, // KEEP conditional internet explorer comments
  spare: false,       // KEEP redundant attributes
  quotes: true,       // KEEP arbitrary quotes
  loose: false        // KEEP one whitespace
});

module.exports = {
  beforeSend: function(req, res, page, next) {
    if (!page.html) {
      return next();
    }

    minimize.parse(page.html, function(error, minified) {
      if (!error) {
        page.html = minified;
      }
      next();
    });
  }
};
