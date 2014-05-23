export default {
  name: 'ember-prerender',
  initialize: function(container, application) {
    if (document.createEvent) {
      window.prerenderEvent = document.createEvent('Event');
      window.prerenderEvent.initEvent('XContentReady', false, false);
    }
    application.prerenderReady = function() {
      if (window.prerenderEvent) {
        console.log('PRERENDER READY');
        document.dispatchEvent(window.prerenderEvent);
      }
    };
  }
};

