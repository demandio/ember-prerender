module.exports = {
  beforeSend: function(page, next) {
    if (page.url.indexOf('/email/') === 0) {
      var subjectRe = /<title>(.*?)<\/title>/;
      var subject = page.html.toString().match(subjectRe);

      var bodyRe = /<section id="email-message">(.*?)<\/section>/;
      var body = page.html.toString().match(bodyRe);

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
    }

    next();
  }
};
