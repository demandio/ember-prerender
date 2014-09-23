import Ember from 'ember';
import ENV from 'example/config/environment';

export default Ember.Mixin.create({
  actions: {
    didTransition: function() {
      var fields = {};
      var currentHandlerInfos = this.router.get('router.currentHandlerInfos');
      for (var i = 0; i < currentHandlerInfos.length; i++) {
        var controller = this.controllerFor(currentHandlerInfos[i].name);
        if (controller.metaFields) {
          Ember.$.extend(fields, controller.metaFields());
        }
      }
      this._addMetaTags(fields);
      this._super();
    }
  },

  _addMetaTags: function(fields) {
    var tags = [];

    if (fields.description) {
      tags.push({
        name: 'description',
        content: fields.description
      });
    }

    if (fields.statusCode) {
      tags.push({
        property: 'prerender:status-code',
        content: fields.statusCode
      });
    }

    if (fields.header) {
      tags.push({
        property: 'prerender:header',
        content: fields.header
      });
    }

    document.title = fields.title || ENV.APP.DEFAULT_PAGE_TITLE;

    Ember.$('#meta-start').nextUntil('#meta-end').remove();
    for (var i = 0; i < tags.length; i++) {
      Ember.$('#meta-start').after(Ember.$('<meta>', tags[i]));
    }
  }
});

