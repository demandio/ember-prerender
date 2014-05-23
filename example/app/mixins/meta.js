export default Ember.Mixin.create({
  actions: {
    didTransition: function() {
      var fields = {};
      var currentHandlerInfos = this.router.get('router.currentHandlerInfos');
      for (var i = 0; i < currentHandlerInfos.length; i++) {
        var controller = this.controllerFor(currentHandlerInfos[i].name);
        if (controller.metaFields) {
          $.extend(fields, controller.metaFields());
        }
      }
      if (fields.title) {
        document.title = fields.title;
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

    $('#meta-start').nextUntil('#meta-end').remove();
    for (var i = 0; i < tags.length; i++) {
      $('#meta-start').after($('<meta>', tags[i]));
    }
  }
});

