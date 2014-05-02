var Router = Ember.Router.extend({
  location: 'auto'
});

Router.map(function() {
  this.resource('dynamic');
  this.route('missing', { path: '/*path' });
});

export default Router;
