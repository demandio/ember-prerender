import Ember from 'ember';
import Meta from '../mixins/meta';
import EmberPrerender from '../mixins/ember-prerender';

export default Ember.Route.extend(Meta, EmberPrerender, {
  model: function() {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var feedUrl = 'https://api.flickr.com/services/feeds/groups_pool.gne?id=52253782@N00&format=json&jsoncallback=?';
      Ember.$.getJSON(feedUrl)
        .done(function(data) {
          Ember.run(null, resolve, data);
        })
        .fail(function(jqXHR) {
          Ember.run(null, reject, jqXHR);
        });
    });
  },

  afterModel: function() {
    console.log('Got data from API');
    this._super.apply(this, arguments);
  }
});
