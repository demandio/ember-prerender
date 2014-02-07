module.exports = {
  beforeInit: function(page, next) {
    var disableTagsRe = /<script>[^<]+(?:google-analytics\.com|connect\.facebook\.net|platform\.twitter\.com)[^<]+<\/script>|<link [^>]+>/g;
    page.html = page.html.toString().replace(disableTagsRe, '<!-- Prerender: $& -->');

    next();
  },
  beforeSend: function(page, next) {
    if (!page.html) {
      return next();
    }

    var stripTagsRe = /<(?:script|iframe)[^>]+>.*?<\/(?:script|iframe)>|<!--(?! Prerender: )[\S\s]*?-->/g;
    page.html = page.html.toString().replace(stripTagsRe, '');

    var enableTagsRe = /<!-- Prerender: ([\S\s]*?)-->/g;
    page.html = page.html.toString().replace(enableTagsRe, '$1');

    next();
  }
};
