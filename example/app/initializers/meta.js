import Ember from 'ember';
import ENV from 'example/config/environment';

export default {
  name: 'meta',
  initialize: function() {
    ENV.APP.DEFAULT_PAGE_TITLE = document.title;

    Ember.$('head').append(
      Ember.$('<script>', {
        id: 'meta-start',
        type: 'text/x-placeholder'
      }),
      Ember.$('<script>', {
        id: 'meta-end',
        type: 'text/x-placeholder'
      })
    );
  }
};
