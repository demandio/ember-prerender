import Meta from 'example/mixins/meta';
import EmberPrerender from 'example/mixins/ember-prerender';

export default Ember.Route.extend(Meta, EmberPrerender, {
  enter: function() {
    if (!window.isPrerender) {
      setTimeout(function() {
          window.location.replace("http://github.com/");
      }, 5000);
    }
  }
});
