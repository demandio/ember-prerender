module.exports = {
  beforeSend: function(req, res, page, next) {
    if (page.url.indexOf('/email/') === 0) {
      var subjectRe = /<title>(.*?)<\/title>/;
      var subject = page.html.match(subjectRe);

      var bodyRe = /<section id="email-message">(.*?)<\/section>/;
      var body = page.html.match(bodyRe);
      if (subject && subject.length > 1 && body && body.length > 1) {
        page.html = "<!doctype html>\n" +
          "<html lang=\"en\">\n" +
          "<head>\n" +
          "  <meta charset=\"utf-8\">\n" +
          "  <title>" + subject[1] + "</title>\n" +
          "  <meta name=\"robots\" content=\"noindex,nofollow\">\n" +
          "</head>\n" +
          "<body>\n" +
            body[1] + "\n" +
          "</body>\n" +
          "</html>";
      } else {
        page.statusCode = 500;
        page.html = "500 Internal Server Error";
      }
    }

    next();
  }
};
