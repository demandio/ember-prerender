import Ember from 'ember';
import Meta from '../mixins/meta';
import EmberPrerender from '../mixins/ember-prerender';

export default Ember.Route.extend(Meta, EmberPrerender, {
  enter: function() {
    if (!window.isPrerender) {
      setTimeout(function() {
          window.location.replace("http://github.com/");
      }, 5000);
    }
  }
});
