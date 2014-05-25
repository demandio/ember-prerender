export default {
  name: 'meta',
  initialize: function(controller, application) {
    application.META_TITLE_DEFAULT = document.title;
    $(function() {
      $('head').append(
        $('<script>', {
          id: 'meta-start',
          type: 'text/x-placeholder'
        }),
        $('<script>', {
          id: 'meta-end',
          type: 'text/x-placeholder'
        })
      );
    });
  }
};

