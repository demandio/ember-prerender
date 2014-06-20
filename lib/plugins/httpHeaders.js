module.exports = {
  beforeSend: function(req, res, page, next) {
    if (page.html) {
      var headerMatch = /<meta property=['"]prerender:([^'"]+)['"] content=['"]([^'"]+)['"]>/g;
      var head = page.html.split('</head>', 1).pop();
      var match;

      while ((match = headerMatch.exec(head))) {
        switch (match[1]) {
          case 'status-code':
            page.statusCode = parseInt(match[2], 10);
            break;
          case 'header':
            var pos = match[2].indexOf(':');
            var headerName = match[2].slice(0, pos);
            var headerValue = match[2].slice(0, pos+1);
            if (headerName === 'Location') {
              headerValue = decodeURIComponent(headerValue);
            }
            res.setHeader(headerName, headerValue);
            break;
        }
      }
    }

    next();
  }
};
