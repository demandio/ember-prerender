module.exports = {
  beforeInit: function(page, next) {
    var analyticsRe = /<script>[^<]+(google-analytics\.com|connect\.facebook\.net|platform\.twitter\.com)[^<]+<\/script>/g;
    page.html = page.html.toString().replace(analyticsRe, '');

    next();
  },
  beforeSend: function(page, next) {
    if (!page.html) {
      return next();
    }

    var matches = page.html.toString().match(/(?:<(?:script|iframe)(?:.*?)>|<!--)(?:[\S\s]*?)(?:-->|<\/(?:script|iframe)>)/gi);
    if (matches) {
      matches.forEach(function(match) {
        page.html = page.html.toString().replace(match, '');
      });
    }

    next();
  }
};
