import Ember from 'ember';
import config from './config/environment';

var Router = Ember.Router.extend({
  location: config.locationType
});

Router.map(function() {
  this.resource('dynamic');
  this.route('crash');
  this.route('redirect');
  this.route('missing', { path: '/*path' });
});

export default Router;
