export default {
  name: 'meta',
  initialize: function() {
    $(function() {
      $('head').append($('<script>', {
        id: 'meta-start',
        type: 'text/x-placeholder'
      }));

      $('head').append($('<script>', {
        id: 'meta-end',
        type: 'text/x-placeholder'
      }));
    });
  }
};

