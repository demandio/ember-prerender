module.exports = {
  beforeSend: function(page, next) {
    if (!page.html) {
      return next();
    }

    var stripCommentsRe = /<!--[\S\s]*?-->|<(?:script|iframe)[^>]*>[\S\s]*?<\/(?:script|iframe)>/g;
    page.html = page.html.replace(stripCommentsRe, '');

    next();
  }
};
