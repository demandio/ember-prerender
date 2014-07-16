import Ember from 'ember';

export default Ember.Controller.extend({
  metaFields: function() {
    return {
      title: "Missing",
      statusCode: 404
    };
  }
});
