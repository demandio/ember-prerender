var Router = Ember.Router.extend({
  rootURL: ENV.rootURL,
  location: 'auto'
});

Router.map(function() {
  this.resource('dynamic');
  this.route('missing', { path: '/*path' });
});

export default Router;
