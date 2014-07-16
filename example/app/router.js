import Ember from 'ember';

var Router = Ember.Router.extend({
  location: ExampleENV.locationType
});

Router.map(function() {
  this.resource('dynamic');
  this.route('crash');
  this.route('redirect');
  this.route('missing', { path: '/*path' });
});

export default Router;
