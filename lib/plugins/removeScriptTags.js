module.exports = {
  beforeSend: function(req, res, page, next) {
    if (!page.html) {
      return next();
    }

    var stripCommentsRe = /<!--([\S\s]*?)-->|<(?:script|iframe)[^>]*>[\S\s]*?<\/(?:script|iframe)>|<meta name=["']fragment["'][^>]*>/g;
    page.html = page.html.replace(stripCommentsRe, '');

    next();
  }
};
