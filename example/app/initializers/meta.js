export default {
  name: 'meta',
  initialize: function() {
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

