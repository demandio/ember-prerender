import Ember from 'ember';

export default Ember.Controller.extend({
  metaFields: function() {
    return {
      title: "Redirecting...",
      statusCode: 301,
      header: "Location: http://github.com/"
    };
  }
});
