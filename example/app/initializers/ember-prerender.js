import Ember from 'ember';

export default {
  name: 'ember-prerender',
  initialize: function(container) {
    if (document.createEvent) {
      window.prerenderReadyEvent = document.createEvent('Event');
      window.prerenderReadyEvent.initEvent('XContentReady', false, false);
      window.prerenderTransitionEvent = document.createEvent('Event');
      window.prerenderTransitionEvent.initEvent('XPushState', false, false);
    }

    window.prerenderReady = function() {
      if (window.prerenderReadyEvent) {
        console.debug('PRERENDER READY');
        document.dispatchEvent(window.prerenderReadyEvent);
      }
    };

    document.addEventListener('XPushState', function(event) {
      var router = container.lookup('router:main');
      Ember.run(function() {
        router.replaceWith(event.url).then(function(route) {
          if (route.handlerInfos) {
            // The requested route was already loaded
            window.prerenderReady();
          }
        });
      });
    }, false);
  }
};

