export default Ember.Controller.extend({
  init: function() {
    console.log("Throwing error in 1 second...");
    Em.run.later(function() {
      throw "An error occurred";
    }, 1000);
  }
});
