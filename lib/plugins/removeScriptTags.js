module.exports = {
  beforeSend: function(req, res, page, next) {
    if (!page.html) {
      return next();
    }

    // Note: Stripping of comments is now handled in the minifyHtml plugin
    //var stripCommentsRe = /<!--(?!\[if)[\S\s]*?(?!<!\[endif\])-->/g;
    //page.html = page.html.replace(stripCommentsRe, '');

    var stripScriptsRe = /<(?:script|iframe)(?! data-preserve="true")[^>]*>[\S\s]*?<\/(?:script|iframe)>/g;
    page.html = page.html.replace(stripScriptsRe, '');

    next();
  }
};
