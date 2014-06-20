import Meta from 'example/mixins/meta';
import EmberPrerender from 'example/mixins/ember-prerender';

export default Ember.Route.extend(Meta, EmberPrerender, {
  enter: function() {
    Ember.run.later(function() {
      window.location.href = "http://github.com/";
    }, 5000);
  }
});
