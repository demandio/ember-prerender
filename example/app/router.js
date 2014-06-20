var Router = Ember.Router.extend({
  location: ENV.locationType
});

Router.map(function() {
  this.resource('dynamic');
  this.route('crash');
  this.route('redirect');
  this.route('missing', { path: '/*path' });
});

export default Router;
