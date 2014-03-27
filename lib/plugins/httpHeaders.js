module.exports = {
  beforeSend: function(page, next) {
    if (page.html) {
      var headerMatch = /<meta property=['"]prerender:([^'"]+)['"] content=['"]([^'"]+)['"]>/g;
      var head = page.html.split('</head>', 1).pop();
      var match;

      while (match = headerMatch.exec(head)) {
        switch (match[1]) {
          case 'status-code':
            page.statusCode = parseInt(match[2]);
            break;
          case 'header':
            var header = match[2].split(': ');
            if (header[1] == 'Location') {
              header[2] = decodeURIComponent(header[2]);
            }
            res.setHeader(header[1], header[2]);
            break;
        }
      }
    }

    next();
  }
};
